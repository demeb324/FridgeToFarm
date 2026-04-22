import { NextResponse } from "next/server";
import {
  asNumber,
  asString,
  isIsoDateTime,
  isLatitude,
  isLongitude,
  isRecord,
} from "@/lib/api/validation";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { publishRoute } from "@/lib/services/publish-route";

type RouteContext = { params: Promise<{ id: string }> };

type MutableFields = {
  title?: string;
  start_lat?: number;
  start_lng?: number;
  end_lat?: number;
  end_lng?: number;
  route_polyline?: string;
  start_time?: string;
  end_time?: string;
  notes?: string | null;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Route id is required." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  if (!isRecord(body)) {
    return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 });
  }

  const updates: MutableFields = {};
  if (body.title !== undefined) {
    const v = asString(body.title);
    if (!v) return NextResponse.json({ error: "title must be a non-empty string." }, { status: 400 });
    updates.title = v;
  }
  if (body.start_lat !== undefined) {
    const v = asNumber(body.start_lat);
    if (!isLatitude(v)) return NextResponse.json({ error: "start_lat invalid." }, { status: 400 });
    updates.start_lat = v;
  }
  if (body.start_lng !== undefined) {
    const v = asNumber(body.start_lng);
    if (!isLongitude(v)) return NextResponse.json({ error: "start_lng invalid." }, { status: 400 });
    updates.start_lng = v;
  }
  if (body.end_lat !== undefined) {
    const v = asNumber(body.end_lat);
    if (!isLatitude(v)) return NextResponse.json({ error: "end_lat invalid." }, { status: 400 });
    updates.end_lat = v;
  }
  if (body.end_lng !== undefined) {
    const v = asNumber(body.end_lng);
    if (!isLongitude(v)) return NextResponse.json({ error: "end_lng invalid." }, { status: 400 });
    updates.end_lng = v;
  }
  if (body.route_polyline !== undefined) {
    const v = asString(body.route_polyline);
    if (!v) return NextResponse.json({ error: "route_polyline invalid." }, { status: 400 });
    updates.route_polyline = v;
  }
  if (body.start_time !== undefined) {
    const v = asString(body.start_time);
    if (!isIsoDateTime(v)) return NextResponse.json({ error: "start_time invalid." }, { status: 400 });
    updates.start_time = v;
  }
  if (body.end_time !== undefined) {
    const v = asString(body.end_time);
    if (!isIsoDateTime(v)) return NextResponse.json({ error: "end_time invalid." }, { status: 400 });
    updates.end_time = v;
  }
  if (body.notes !== undefined) {
    updates.notes = body.notes === null ? null : asString(body.notes) || null;
  }

  const driverId = body.driver_id === undefined ? undefined : asString(body.driver_id);
  if (body.driver_id !== undefined && !driverId) {
    return NextResponse.json({ error: "driver_id must be a non-empty string." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  const { data: existing } = await supabase.from("routes").select("id").eq("id", id).single();
  if (!existing) {
    return NextResponse.json({ error: "Route not found." }, { status: 404 });
  }

  if (driverId) {
    const { data: driver } = await supabase.from("drivers").select("id").eq("id", driverId).single();
    if (!driver) {
      return NextResponse.json({ error: "Driver not found." }, { status: 422 });
    }
  }

  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await supabase.from("routes").update(updates).eq("id", id);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  if (driverId) {
    const { data: existingAssignment } = await supabase
      .from("route_assignments")
      .select("id")
      .eq("route_id", id)
      .maybeSingle();

    if (existingAssignment) {
      await supabase
        .from("route_assignments")
        .update({ driver_id: driverId })
        .eq("id", existingAssignment.id);
    } else {
      await supabase
        .from("route_assignments")
        .insert({ route_id: id, driver_id: driverId, status: "assigned" });
    }
  }

  const { data: updated, error: selectError } = await supabase
    .from("routes")
    .select("*, hubs ( id, name, phone, email )")
    .eq("id", id)
    .single();

  if (selectError || !updated) {
    return NextResponse.json({ error: selectError?.message ?? "Route not found." }, { status: 500 });
  }

  let rebroadcast:
    | { farmers_notified: number; notifications: Array<{ farmer_id: string; status: "sent" | "failed" }> }
    | undefined;
  if (updated.published) {
    const result = await publishRoute(id, { allowRepublish: true });
    if (result.ok) {
      rebroadcast = {
        farmers_notified: result.value.farmers_notified,
        notifications: result.value.notifications.map((n) => ({ farmer_id: n.farmer_id, status: n.status })),
      };
    } else {
      console.error("[routes.PATCH] rebroadcast failed:", result.error);
    }
  }

  return NextResponse.json({ route: updated, ...(rebroadcast ? { rebroadcast } : {}) });
}
