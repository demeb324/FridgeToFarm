import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Ctx) {
  const { id } = await context.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Hub id must be a UUID." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  const { data: hubRoutes, error: routesErr } = await supabase
    .from("routes")
    .select("id, start_lat, start_lng, end_lat, end_lng, published")
    .eq("hub_id", id)
    .eq("published", true);
  if (routesErr) return NextResponse.json({ error: routesErr.message }, { status: 500 });

  const routeIds = (hubRoutes ?? []).map((r) => r.id);

  let nearbyGrowers = 0;
  if (hubRoutes && hubRoutes.length > 0) {
    const points = hubRoutes.flatMap((r) => [
      { lat: r.start_lat, lng: r.start_lng },
      { lat: r.end_lat,   lng: r.end_lng   },
    ]);
    const { data: matched, error: matchErr } = await supabase.rpc(
      "find_farmers_near_route_points",
      { route_points: points, radius_miles: 10 },
    );
    if (matchErr) return NextResponse.json({ error: matchErr.message }, { status: 500 });
    nearbyGrowers = new Set((matched ?? []).map((m: { farmer_id: string }) => m.farmer_id)).size;
  }

  let pickupRequests = 0;
  let activeTrips = 0;
  if (routeIds.length > 0) {
    const [{ count: pending }, { count: active }] = await Promise.all([
      supabase.from("route_responses").select("id", { count: "exact", head: true })
        .eq("status", "pending").in("route_id", routeIds),
      supabase.from("route_assignments").select("id", { count: "exact", head: true })
        .in("status", ["started", "in_progress"]).in("route_id", routeIds),
    ]);
    pickupRequests = pending ?? 0;
    activeTrips = active ?? 0;
  }

  return NextResponse.json({ nearbyGrowers, pickupRequests, activeTrips });
}
