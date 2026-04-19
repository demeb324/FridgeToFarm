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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hubId = searchParams.get("hub_id")?.trim();

  const supabase = createAdminSupabaseClient();
  let query = supabase
    .from("routes")
    .select("*, hubs ( id, name, phone, email )")
    .order("created_at", { ascending: false });

  if (hubId) {
    query = query.eq("hub_id", hubId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 });
  }

  const hubId = asString(body.hub_id);
  const title = asString(body.title);
  const routePolyline = asString(body.route_polyline);
  const startTime = asString(body.start_time);
  const endTime = asString(body.end_time);
  const notes = asString(body.notes);

  const startLat = asNumber(body.start_lat);
  const startLng = asNumber(body.start_lng);
  const endLat = asNumber(body.end_lat);
  const endLng = asNumber(body.end_lng);

  if (!hubId || !title || !routePolyline || !startTime || !endTime) {
    return NextResponse.json(
      { error: "hub_id, title, route_polyline, start_time, and end_time are required." },
      { status: 400 },
    );
  }

  if (
    !isLatitude(startLat) ||
    !isLongitude(startLng) ||
    !isLatitude(endLat) ||
    !isLongitude(endLng)
  ) {
    return NextResponse.json({ error: "Route coordinates are invalid." }, { status: 400 });
  }

  if (!isIsoDateTime(startTime) || !isIsoDateTime(endTime)) {
    return NextResponse.json(
      { error: "start_time and end_time must be valid ISO date strings." },
      { status: 400 },
    );
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("routes")
    .insert({
      end_lat: endLat,
      end_lng: endLng,
      end_time: endTime,
      hub_id: hubId,
      notes: notes || null,
      route_polyline: routePolyline,
      start_lat: startLat,
      start_lng: startLng,
      start_time: startTime,
      title,
    })
    .select("*, hubs ( id, name, phone, email )")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
