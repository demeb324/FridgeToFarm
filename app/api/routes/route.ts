import { NextResponse } from "next/server";

import {
  asString,
  isIsoDateTime,
  isRecord,
} from "@/lib/api/validation";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { geocodeAddress, GeocodeError } from "@/lib/services/geocode";
import { getDirectionsPolyline, DirectionsError } from "@/lib/services/directions";
import { formatRouteCreatedAdminSms, sendSms } from "@backend/services/sms";

const ADMIN_SMS_RECIPIENT = "+15052267853";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hubId = searchParams.get("hub_id")?.trim();

  const supabase = createAdminSupabaseClient();
  let query = supabase
    .from("routes")
    .select("*, hubs ( id, name, phone, email ), route_stops ( id, order_index, address, name, latitude, longitude )")
    .order("order_index", { foreignTable: "route_stops", ascending: true })
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
  const driverId = asString(body.driver_id);
  const title = asString(body.title);
  const startTime = asString(body.start_time);
  const endTime = asString(body.end_time);
  const notes = asString(body.notes);
  const startAddress = asString(body.start_address);
  const endAddress = asString(body.end_address);

  if (!hubId || !driverId || !title || !startAddress || !endAddress || !startTime || !endTime) {
    return NextResponse.json(
      { error: "hub_id, driver_id, title, start_address, end_address, start_time, and end_time are required." },
      { status: 400 },
    );
  }

  if (!isIsoDateTime(startTime) || !isIsoDateTime(endTime)) {
    return NextResponse.json(
      { error: "start_time and end_time must be valid ISO date strings." },
      { status: 400 },
    );
  }

  const stops: Array<{ address: string; name?: string | null }> = Array.isArray(body.stops)
    ? body.stops.filter((s: unknown) => typeof s === "object" && s !== null && typeof (s as Record<string, unknown>).address === "string")
    : [];

  const supabase = createAdminSupabaseClient();

  // Geocode addresses
  let startLatLng: { lat: number; lng: number };
  try {
    startLatLng = await geocodeAddress(startAddress, supabase);
  } catch (err) {
    if (err instanceof GeocodeError) {
      return NextResponse.json({ field: "start_address", message: err.message }, { status: 422 });
    }
    throw err;
  }

  let endLatLng: { lat: number; lng: number };
  try {
    endLatLng = await geocodeAddress(endAddress, supabase);
  } catch (err) {
    if (err instanceof GeocodeError) {
      return NextResponse.json({ field: "end_address", message: err.message }, { status: 422 });
    }
    throw err;
  }

  const stopLatLngs: Array<{ lat: number; lng: number }> = [];
  for (let i = 0; i < stops.length; i++) {
    try {
      stopLatLngs.push(await geocodeAddress(stops[i].address, supabase));
    } catch (err) {
      if (err instanceof GeocodeError) {
        return NextResponse.json({ field: `stops[${i}].address`, message: err.message }, { status: 422 });
      }
      throw err;
    }
  }

  // Get directions polyline
  let routePolyline: string;
  try {
    routePolyline = await getDirectionsPolyline(startLatLng, endLatLng, stopLatLngs);
  } catch (err) {
    if (err instanceof DirectionsError) {
      return NextResponse.json({ field: "route", message: err.message }, { status: 422 });
    }
    throw err;
  }

  const { data, error } = await supabase
    .from("routes")
    .insert({
      end_address: endAddress,
      end_lat: endLatLng.lat,
      end_lng: endLatLng.lng,
      end_time: endTime,
      hub_id: hubId,
      notes: notes || null,
      route_polyline: routePolyline,
      start_address: startAddress,
      start_lat: startLatLng.lat,
      start_lng: startLatLng.lng,
      start_time: startTime,
      title,
    })
    .select("*, hubs ( id, name, phone, email ), route_stops ( id, order_index, address, name, latitude, longitude )")
    .order("order_index", { foreignTable: "route_stops", ascending: true })
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Insert stops
  if (stops.length > 0) {
    const stopRows = stops.map((stop, i) => ({
      route_id: data.id,
      order_index: i,
      address: stop.address,
      name: stop.name ?? null,
      latitude: stopLatLngs[i].lat,
      longitude: stopLatLngs[i].lng,
    }));

    const { error: stopsError } = await supabase.from("route_stops").insert(stopRows);
    if (stopsError) {
      console.error("[routes.POST] stops insert failed:", stopsError);
      // Continue — route is created, just stops failed
    }
  }

  // Re-select to get stops
  const { data: routeWithStops } = await supabase
    .from("routes")
    .select("*, hubs ( id, name, phone, email ), route_stops ( id, order_index, address, name, latitude, longitude )")
    .order("order_index", { foreignTable: "route_stops", ascending: true })
    .eq("id", data.id)
    .single();

  const { error: assignmentError } = await supabase
    .from("route_assignments")
    .insert({ route_id: data.id, driver_id: driverId, status: "assigned" });
  if (assignmentError) {
    console.error("[routes.POST] assignment insert failed:", assignmentError);
  }

  try {
    const hub = (routeWithStops ?? data as { hubs?: { name?: string; phone?: string; email?: string } | null }).hubs;
    const message = formatRouteCreatedAdminSms({
      title: (routeWithStops ?? data).title,
      startTime: (routeWithStops ?? data).start_time,
      endTime: (routeWithStops ?? data).end_time,
      hubName: hub?.name ?? "Unknown hub",
      hubPhone: hub?.phone ?? "n/a",
      hubEmail: hub?.email ?? "n/a",
      notes: (routeWithStops ?? data).notes,
    });
    await sendSms(ADMIN_SMS_RECIPIENT, message);
  } catch (smsError) {
    console.error("[routes.POST] admin SMS failed:", smsError);
  }

  const result = routeWithStops ?? data;
  return NextResponse.json({ ...result, route_stops: result.route_stops ?? [] }, { status: 201 });
}