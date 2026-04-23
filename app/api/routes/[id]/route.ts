import { NextResponse } from "next/server";
import {
  asString,
  isIsoDateTime,
  isRecord,
} from "@/lib/api/validation";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { publishRoute } from "@/lib/services/publish-route";
import { geocodeAddress, GeocodeError } from "@/lib/services/geocode";
import { getDirectionsPolyline, DirectionsError } from "@/lib/services/directions";

type RouteContext = { params: Promise<{ id: string }> };

type MutableFields = {
  title?: string;
  start_address?: string;
  end_address?: string;
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

  // --- Address geocoding & stops ---
  const hasStartAddress = body.start_address !== undefined;
  const hasEndAddress = body.end_address !== undefined;
  const hasStops = body.stops !== undefined;

  type StopInput = { address: string; name?: string | null };
  const stops: StopInput[] = [];
  if (hasStops) {
    if (!Array.isArray(body.stops)) {
      return NextResponse.json({ error: "stops must be an array." }, { status: 400 });
    }
    for (let i = 0; i < body.stops.length; i++) {
      const s = body.stops[i];
      if (typeof s !== "object" || s === null || typeof s.address !== "string") {
        return NextResponse.json({ error: `stops[${i}].address must be a string.` }, { status: 400 });
      }
      stops.push({ address: s.address, name: s.name ?? null });
    }
  }

  const stopLatLngs: Array<{ lat: number; lng: number }> = [];

  if (hasStartAddress) {
    const addr = asString(body.start_address);
    if (!addr) return NextResponse.json({ error: "start_address must be a non-empty string." }, { status: 400 });
    try {
      const ll = await geocodeAddress(addr, supabase);
      updates.start_address = addr;
      updates.start_lat = ll.lat;
      updates.start_lng = ll.lng;
    } catch (err) {
      if (err instanceof GeocodeError) {
        return NextResponse.json({ field: "start_address", message: err.message }, { status: 422 });
      }
      throw err;
    }
  }

  if (hasEndAddress) {
    const addr = asString(body.end_address);
    if (!addr) return NextResponse.json({ error: "end_address must be a non-empty string." }, { status: 400 });
    try {
      const ll = await geocodeAddress(addr, supabase);
      updates.end_address = addr;
      updates.end_lat = ll.lat;
      updates.end_lng = ll.lng;
    } catch (err) {
      if (err instanceof GeocodeError) {
        return NextResponse.json({ field: "end_address", message: err.message }, { status: 422 });
      }
      throw err;
    }
  }

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

  const needsDirections = hasStartAddress || hasEndAddress || hasStops;

  if (needsDirections) {
    const { data: current } = await supabase
      .from("routes")
      .select("start_lat, start_lng, end_lat, end_lng")
      .eq("id", id)
      .single();

    const origin = {
      lat: updates.start_lat ?? current!.start_lat,
      lng: updates.start_lng ?? current!.start_lng,
    };
    const destination = {
      lat: updates.end_lat ?? current!.end_lat,
      lng: updates.end_lng ?? current!.end_lng,
    };

    let waypoints: Array<{ lat: number; lng: number }>;
    if (hasStops) {
      waypoints = stopLatLngs;
    } else {
      const { data: existingStops } = await supabase
        .from("route_stops")
        .select("latitude, longitude")
        .eq("route_id", id)
        .order("order_index", { ascending: true });
      waypoints = (existingStops ?? []).map((s) => ({ lat: s.latitude, lng: s.longitude }));
    }

    try {
      updates.route_polyline = await getDirectionsPolyline(origin, destination, waypoints);
    } catch (err) {
      if (err instanceof DirectionsError) {
        return NextResponse.json({ field: "route", message: err.message }, { status: 422 });
      }
      throw err;
    }
  }

  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await supabase.from("routes").update(updates).eq("id", id);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  if (hasStops) {
    await supabase.from("route_stops").delete().eq("route_id", id);

    if (stops.length > 0) {
      const stopRows = stops.map((stop, i) => ({
        route_id: id,
        order_index: i,
        address: stop.address,
        name: stop.name ?? null,
        latitude: stopLatLngs[i].lat,
        longitude: stopLatLngs[i].lng,
      }));
      const { error: stopsError } = await supabase.from("route_stops").insert(stopRows);
      if (stopsError) {
        console.error("[routes.PATCH] stops insert failed:", stopsError);
      }
    }
  }

  if (driverId) {
    const { data: existingAssignment } = await supabase
      .from("route_assignments")
      .select("id")
      .eq("route_id", id)
      .maybeSingle();

    if (existingAssignment) {
      const { error: assignUpdateError } = await supabase
        .from("route_assignments")
        .update({ driver_id: driverId })
        .eq("id", existingAssignment.id);
      if (assignUpdateError) {
        return NextResponse.json({ error: assignUpdateError.message }, { status: 500 });
      }
    } else {
      const { error: assignInsertError } = await supabase
        .from("route_assignments")
        .insert({ route_id: id, driver_id: driverId, status: "assigned" });
      if (assignInsertError) {
        return NextResponse.json({ error: assignInsertError.message }, { status: 500 });
      }
    }
  }

  const { data: updated, error: selectError } = await supabase
    .from("routes")
    .select("*, hubs ( id, name, phone, email ), route_stops ( id, order_index, address, name, latitude, longitude )")
    .order("order_index", { foreignTable: "route_stops", ascending: true })
    .eq("id", id)
    .single();

  if (selectError || !updated) {
    return NextResponse.json({ error: selectError?.message ?? "Route not found." }, { status: 500 });
  }

  const notifySms = body.notify_sms !== false;

  let rebroadcast:
    | { farmers_notified: number; notifications: Array<{ farmer_id: string; status: "sent" | "failed" }> }
    | undefined;
  if (updated.published && notifySms) {
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

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Route id is required." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  const { data: existing } = await supabase.from("routes").select("id").eq("id", id).single();
  if (!existing) {
    return NextResponse.json({ error: "Route not found." }, { status: 404 });
  }

  // Manually delete child rows that use ON DELETE RESTRICT before deleting the route.
  await supabase.from("notification_log").delete().eq("route_id", id);
  await supabase.from("route_responses").delete().eq("route_id", id);
  // route_stops and route_assignments use ON DELETE CASCADE and will be cleaned up automatically.

  const { error } = await supabase.from("routes").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}