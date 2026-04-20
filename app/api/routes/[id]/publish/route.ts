import { NextResponse } from "next/server";

import { sendSms, formatRouteSmsMessage } from "@backend/services/sms";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: "Route id is required." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  // 1. Load route with hub info
  const { data: route, error: routeError } = await supabase
    .from("routes")
    .select("*, hubs ( id, name, phone, email )")
    .eq("id", id)
    .single();

  if (routeError || !route) {
    return NextResponse.json({ error: "Route not found." }, { status: 404 });
  }

  if (route.published) {
    return NextResponse.json({ error: "Route already published." }, { status: 409 });
  }

  console.log(`[publish] Publishing route ${id}: "${route.title}"`);

  // 2. Build route points for proximity matching
  // Uses start + end points. When frontend sends decoded route_points, pass those instead.
  const routePoints = [
    { lat: route.start_lat, lng: route.start_lng },
    { lat: route.end_lat, lng: route.end_lng },
  ];

  // 3. Call Postgres function to find nearby farmers
  const { data: matchedFarmers, error: matchError } = await supabase.rpc(
    "find_farmers_near_route_points",
    { route_points: routePoints, radius_miles: 10 }
  );

  if (matchError) {
    console.error(`[publish] Proximity matching failed:`, matchError);
    return NextResponse.json({ error: "Proximity matching failed." }, { status: 500 });
  }

  console.log(`[publish] Matched ${matchedFarmers?.length ?? 0} farmers`);

  // 4. Send SMS to each matched farmer
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  const hub = route.hubs;
  const routeDate = new Date(route.start_time).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const notifications: Array<{ farmer_id: string; farmer_name: string; status: string }> = [];

  for (const farmer of matchedFarmers ?? []) {
    const responseUrl = `${baseUrl}/respond?route=${id}&farmer=${farmer.farmer_id}`;
    const message = formatRouteSmsMessage({
      hubName: hub.name,
      routeDate,
      responseUrl,
      hubPhone: hub.phone,
      hubEmail: hub.email,
    });

    const smsResult = await sendSms(farmer.phone, message);

    // Log to notification_log
    await supabase.from("notification_log").insert({
      route_id: id,
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

  // 5. Mark route as published
  const { data, error } = await supabase
    .from("routes")
    .update({ published: true })
    .eq("id", id)
    .select("*, hubs ( id, name, phone, email )")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const sentCount = notifications.filter((n) => n.status === "sent").length;
  const failedCount = notifications.filter((n) => n.status === "failed").length;
  console.log(`[publish] Route ${id} published: ${sentCount} sent, ${failedCount} failed`);

  return NextResponse.json({
    route: data,
    farmers_notified: sentCount,
    notifications,
  });
}