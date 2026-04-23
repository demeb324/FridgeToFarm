import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { sendSms, formatRouteSmsMessage } from "@backend/services/sms";

export type PublishNotification = {
  farmer_id: string;
  farmer_name: string;
  status: "sent" | "failed";
};

export type PublishRouteResult = {
  route: Record<string, unknown> & { id: string; published: boolean };
  farmers_notified: number;
  notifications: PublishNotification[];
};

export type PublishRouteError =
  | { kind: "not_found" }
  | { kind: "already_published" }
  | { kind: "proximity_failed"; message: string }
  | { kind: "update_failed"; message: string };

/**
 * Runs proximity match → SMS → notification_log → mark published.
 *
 * When `allowRepublish: true`, the already-published guard is skipped and the
 * route is re-broadcast as-is (used by PATCH when editing a published route).
 */
export async function publishRoute(
  routeId: string,
  opts: { allowRepublish?: boolean } = {},
): Promise<{ ok: true; value: PublishRouteResult } | { ok: false; error: PublishRouteError }> {
  const supabase = createAdminSupabaseClient();

  const { data: route, error: routeError } = await supabase
    .from("routes")
    .select("*, hubs ( id, name, phone, email )")
    .eq("id", routeId)
    .single();

  if (routeError || !route) {
    return { ok: false, error: { kind: "not_found" } };
  }

  if (route.published && !opts.allowRepublish) {
    return { ok: false, error: { kind: "already_published" } };
  }

  console.log(`[publishRoute] Publishing route ${routeId}: "${route.title}"`);

  const routePoints = [
    { lat: route.start_lat, lng: route.start_lng },
    { lat: route.end_lat, lng: route.end_lng },
  ];

  const { data: matchedFarmers, error: matchError } = await supabase.rpc(
    "find_farmers_near_route_points",
    { route_points: routePoints, radius_miles: 10 },
  );

  if (matchError) {
    console.error(`[publishRoute] Proximity matching failed:`, matchError);
    return { ok: false, error: { kind: "proximity_failed", message: matchError.message } };
  }

  console.log(`[publishRoute] Matched ${matchedFarmers?.length ?? 0} farmers`);

  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  const hub = route.hubs;
  const routeDate = new Date(route.start_time).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const notifications: PublishNotification[] = [];

  for (const farmer of matchedFarmers ?? []) {
    const responseUrl = `${baseUrl}/respond?route=${routeId}&farmer=${farmer.farmer_id}`;
    const message = formatRouteSmsMessage({
      hubName: hub.name,
      routeDate,
      responseUrl,
      hubPhone: hub.phone,
      hubEmail: hub.email,
    });

    const smsResult = await sendSms(farmer.phone, message);

    await supabase.from("notification_log").insert({
      route_id: routeId,
      farmer_id: farmer.farmer_id,
      status: smsResult.status === "sent" ? "sent" : "failed",
      twilio_sid: smsResult.sid || null,
      error_message: smsResult.error || null,
    });

    notifications.push({
      farmer_id: farmer.farmer_id,
      farmer_name: farmer.farmer_name,
      status: smsResult.status === "sent" ? "sent" : "failed",
    });
  }

  const { data: updated, error: updateError } = await supabase
    .from("routes")
    .update({ published: true })
    .eq("id", routeId)
    .select("*, hubs ( id, name, phone, email )")
    .single();

  if (updateError) {
    return { ok: false, error: { kind: "update_failed", message: updateError.message } };
  }

  const sentCount = notifications.filter((n) => n.status === "sent").length;
  const failedCount = notifications.filter((n) => n.status === "failed").length;
  console.log(`[publishRoute] Route ${routeId} published: ${sentCount} sent, ${failedCount} failed`);

  return {
    ok: true,
    value: {
      route: updated as PublishRouteResult["route"],
      farmers_notified: sentCount,
      notifications,
    },
  };
}
