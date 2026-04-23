import { config } from "dotenv";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { PATCH } from "@/app/api/routes/[id]/route";
import type { Database } from "@/lib/supabase/database.types";

config({ path: ".env.local" });

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const TEST_TAG = `itest-patch-${Date.now()}`;
const ABQ_LAT = 35.0844;
const ABQ_LNG = -106.6504;
const TEST_FARMER_PHONE = `+1505${String(Date.now()).slice(-7)}`;

const createdHubIds: string[] = [];
const createdDriverIds: string[] = [];
const createdRouteIds: string[] = [];
const createdFarmerIds: string[] = [];

async function insertHub() {
  const { data, error } = await supabase
    .from("hubs")
    .insert({ name: `Hub ${TEST_TAG}`, phone: "+15559990001", email: `${TEST_TAG}@example.com` })
    .select().single();
  if (error) throw error;
  createdHubIds.push(data.id);
  return data;
}

async function insertDriver(hubId: string, suffix: string) {
  const { data, error } = await supabase
    .from("drivers")
    .insert({
      hub_id: hubId,
      first_name: `Drv${suffix}`,
      last_name: TEST_TAG,
      phone: `+15559${Math.floor(100000 + Math.random() * 899999)}`,
    })
    .select().single();
  if (error) throw error;
  createdDriverIds.push(data.id);
  return data;
}

async function insertRoute(hubId: string, published = false) {
  const { data, error } = await supabase
    .from("routes")
    .insert({
      title: `Route ${TEST_TAG}`,
      hub_id: hubId,
      start_address: "400 Marquette Ave NW, Albuquerque, NM 87102",
      end_address: "63 Lincoln Ave, Santa Fe, NM 87501",
      start_lat: ABQ_LAT, start_lng: ABQ_LNG,
      end_lat: ABQ_LAT + 0.01, end_lng: ABQ_LNG + 0.01,
      start_time: "2026-06-01T09:00:00Z",
      end_time: "2026-06-01T17:00:00Z",
      route_polyline: "test_polyline",
      notes: "original",
      published,
    })
    .select().single();
  if (error) throw error;
  createdRouteIds.push(data.id);
  return data;
}

async function insertNearbyFarmer(suffix: string) {
  const { data: prior } = await supabase.from("farmers").select("id").eq("phone", TEST_FARMER_PHONE);
  const priorIds = (prior ?? []).map((f) => f.id);
  if (priorIds.length) {
    await supabase.from("notification_log").delete().in("farmer_id", priorIds);
    await supabase.from("route_responses").delete().in("farmer_id", priorIds);
    await supabase.from("farmers").delete().in("id", priorIds);
  }
  const { data, error } = await supabase
    .from("farmers")
    .insert({
      name: `Farmer ${suffix} ${TEST_TAG}`,
      phone: TEST_FARMER_PHONE,
      address_text: "Near ABQ",
      latitude: ABQ_LAT + 0.005,
      longitude: ABQ_LNG + 0.005,
    })
    .select().single();
  if (error) throw error;
  createdFarmerIds.push(data.id);
  return data;
}

async function callPatch(routeId: string, body: unknown) {
  const req = new Request(`http://localhost/api/routes/${routeId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const ctx = { params: Promise.resolve({ id: routeId }) };
  return PATCH(req, ctx);
}

afterAll(async () => {
  await supabase.from("notification_log").delete().in("route_id", createdRouteIds.length ? createdRouteIds : ["__none__"]);
  await supabase.from("route_responses").delete().in("route_id", createdRouteIds.length ? createdRouteIds : ["__none__"]);
  await supabase.from("route_stops").delete().in("route_id", createdRouteIds.length ? createdRouteIds : ["__none__"]);
  await supabase.from("route_assignments").delete().in("route_id", createdRouteIds.length ? createdRouteIds : ["__none__"]);
  await supabase.from("routes").delete().in("id", createdRouteIds.length ? createdRouteIds : ["__none__"]);
  await supabase.from("farmers").delete().in("id", createdFarmerIds.length ? createdFarmerIds : ["__none__"]);
  await supabase.from("drivers").delete().in("id", createdDriverIds.length ? createdDriverIds : ["__none__"]);
  await supabase.from("hubs").delete().in("id", createdHubIds.length ? createdHubIds : ["__none__"]);
});

describe("PATCH /api/routes/:id — integration", () => {
  let hub: Awaited<ReturnType<typeof insertHub>>;

  beforeAll(async () => {
    hub = await insertHub();
  });

  it("updates title and notes on unpublished route, returns no rebroadcast", async () => {
    const route = await insertRoute(hub.id, false);
    const res = await callPatch(route.id, { title: "Updated title", notes: "new notes" });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.route.title).toBe("Updated title");
    expect(json.route.notes).toBe("new notes");
    expect(json.rebroadcast).toBeUndefined();
  });

  it("updates driver_id — upserts route_assignments", async () => {
    const route = await insertRoute(hub.id, false);
    const d1 = await insertDriver(hub.id, "A");
    const d2 = await insertDriver(hub.id, "B");

    let res = await callPatch(route.id, { driver_id: d1.id });
    expect(res.status).toBe(200);
    let { data: asgn } = await supabase
      .from("route_assignments").select("*").eq("route_id", route.id);
    expect(asgn).toHaveLength(1);
    expect(asgn![0].driver_id).toBe(d1.id);

    res = await callPatch(route.id, { driver_id: d2.id });
    expect(res.status).toBe(200);
    ({ data: asgn } = await supabase
      .from("route_assignments").select("*").eq("route_id", route.id));
    expect(asgn).toHaveLength(1);
    expect(asgn![0].driver_id).toBe(d2.id);
  });

  it("editing a published route triggers rebroadcast", async () => {
    const farmer = await insertNearbyFarmer("reb");
    const route = await insertRoute(hub.id, true);

    const res = await callPatch(route.id, { title: "Retitled" });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.rebroadcast).toBeDefined();
    expect(json.rebroadcast.farmers_notified).toBeGreaterThanOrEqual(1);

    const { data: logs } = await supabase
      .from("notification_log").select("*").eq("route_id", route.id);
    expect(logs!.some((l) => l.farmer_id === farmer.id)).toBe(true);
  });

  it("returns 404 for nonexistent route", async () => {
    const res = await callPatch("00000000-0000-0000-0000-000000000000", { title: "x" });
    expect(res.status).toBe(404);
  });

  it("returns 400 for malformed body", async () => {
    const route = await insertRoute(hub.id, false);
    const req = new Request(`http://localhost/api/routes/${route.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: "not-json",
    });
    const ctx = { params: Promise.resolve({ id: route.id }) };
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(400);
  });

  it("returns 422 when driver_id references a nonexistent driver", async () => {
    const route = await insertRoute(hub.id, false);
    const res = await callPatch(route.id, { driver_id: "00000000-0000-0000-0000-000000000000" });
    expect(res.status).toBe(422);
  });
});