import { config } from "dotenv";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { GET } from "@/app/api/hubs/[id]/stats/route";
import type { Database } from "@/lib/supabase/database.types";

config({ path: ".env.local" });

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const HUB_ID = "1e53e9e8-11db-4012-9451-f996632cd250";
const DRIVER_ID = "d0000001-0000-0000-0000-000000000001";
const TAG = `itest-stats-${Date.now()}`;
let routeId = "";
let farmerId = "";
let assignmentId = "";
let responseId = "";

beforeAll(async () => {
  const { data: prior } = await supabase.from("farmers").select("id").eq("phone", "+15052267999");
  const priorIds = (prior ?? []).map((f) => f.id);
  if (priorIds.length) {
    await supabase.from("route_responses").delete().in("farmer_id", priorIds);
    await supabase.from("notification_log").delete().in("farmer_id", priorIds);
    await supabase.from("farmers").delete().in("id", priorIds);
  }

  const { data: f } = await supabase.from("farmers").insert({
    name: `Stats Farmer ${TAG}`, phone: "+15052267999",
    address_text: "addr", latitude: 35.085, longitude: -106.651,
  }).select("id").single();
  farmerId = f!.id;

  const { data: r } = await supabase.from("routes").insert({
    hub_id: HUB_ID, title: `${TAG} stats-route`, route_polyline: "x",
    start_lat: 35.085, start_lng: -106.651,
    end_lat: 35.09, end_lng: -106.65,
    start_time: "2026-06-01T09:00:00Z",
    end_time: "2026-06-01T11:00:00Z",
    published: true,
  }).select("id").single();
  routeId = r!.id;

  const { data: a } = await supabase.from("route_assignments").insert({
    route_id: routeId, driver_id: DRIVER_ID, status: "in_progress",
  }).select("id").single();
  assignmentId = a!.id;

  const { data: rr } = await supabase.from("route_responses").insert({
    route_id: routeId, farmer_id: farmerId,
    response_type: "crop_pickup", status: "pending",
  }).select("id").single();
  responseId = rr!.id;
});

afterAll(async () => {
  await supabase.from("route_responses").delete().eq("id", responseId);
  await supabase.from("route_assignments").delete().eq("id", assignmentId);
  await supabase.from("routes").delete().eq("id", routeId);
  await supabase.from("farmers").delete().eq("id", farmerId);
});

describe("GET /api/hubs/[id]/stats", () => {
  it("returns counts with our seeded fixtures reflected", async () => {
    const res = await GET(new Request(`http://localhost/api/hubs/${HUB_ID}/stats`), {
      params: Promise.resolve({ id: HUB_ID }),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      nearbyGrowers: number; pickupRequests: number; activeTrips: number;
    };
    expect(json.nearbyGrowers).toBeGreaterThanOrEqual(1);
    expect(json.pickupRequests).toBeGreaterThanOrEqual(1);
    expect(json.activeTrips).toBeGreaterThanOrEqual(1);
  });

  it("400 on invalid hub id", async () => {
    const res = await GET(new Request("http://localhost/api/hubs/nope/stats"), {
      params: Promise.resolve({ id: "nope" }),
    });
    expect(res.status).toBe(400);
  });
});
