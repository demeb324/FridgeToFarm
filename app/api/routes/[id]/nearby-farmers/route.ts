import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Ctx) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Route id is required." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  const { data: route, error: routeError } = await supabase
    .from("routes")
    .select("start_lat, start_lng, end_lat, end_lng, route_stops(latitude, longitude)")
    .eq("id", id)
    .single();

  if (routeError || !route) {
    return NextResponse.json({ error: "Route not found." }, { status: 404 });
  }

  const routePoints = [
    { lat: route.start_lat, lng: route.start_lng },
    { lat: route.end_lat, lng: route.end_lng },
    ...(route.route_stops ?? []).map((s: { latitude: number; longitude: number }) => ({
      lat: s.latitude,
      lng: s.longitude,
    })),
  ];

  const { data, error } = await supabase.rpc("find_farmers_near_route_points", {
    route_points: routePoints,
    radius_miles: 10,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
