import { config } from "dotenv";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { PATCH } from "@/app/api/routes/[id]/publish/route";
import type { Database } from "@/lib/supabase/database.types";

config({ path: ".env.local" });

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const TEST_TAG = `itest-${Date.now()}`;
const ALBUQUERQUE_LAT = 35.0844;
const ALBUQUERQUE_LNG = -106.6504;
const FARMER_OFFSET = 0.005;

const createdFarmerIds: string[] = [];
const createdRouteIds: string[] = [];
const createdHubIds: string[] = [];

async function insertTestHub() {
  const { data, error } = await supabase
    .from("hubs")
    .insert({
      name: `Test Hub ${TEST_TAG}`,
      phone: "+15559990000",
      email: `test-${TEST_TAG}@example.com`,
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to insert hub: ${error.message}`);
  createdHubIds.push(data.id);
  return data;
}

const TEST_FARMER_PHONE = "+15052267853";

async function insertTestFarmer(suffix: string, lat: number, lng: number) {
  // farmers.phone has a UNIQUE constraint, but we only have one verified
  // Twilio trial destination to send to. Clear any prior row with this phone
  // (and its FK-dependent notification_log rows) before inserting.
  const { data: priorFarmers } = await supabase
    .from("farmers")
    .select("id")
    .eq("phone", TEST_FARMER_PHONE);
  const priorIds = (priorFarmers ?? []).map((f) => f.id);
  if (priorIds.length) {
    await supabase.from("notification_log").delete().in("farmer_id", priorIds);
    await supabase.from("route_responses").delete().in("farmer_id", priorIds);
    await supabase.from("farmers").delete().in("id", priorIds);
  }

  const { data, error } = await supabase
    .from("farmers")
    .insert({
      name: `Test Farmer ${suffix} ${TEST_TAG}`,
      phone: TEST_FARMER_PHONE,
      address_text: `Test Address ${suffix}`,
      latitude: lat,
      longitude: lng,
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to insert farmer: ${error.message}`);
  createdFarmerIds.push(data.id);
  return data;
}

async function insertTestRoute(hubId: string, lat: number, lng: number) {
  const { data, error } = await supabase
    .from("routes")
    .insert({
      title: `Test Route ${TEST_TAG}`,
      hub_id: hubId,
      start_lat: lat,
      start_lng: lng,
      end_lat: lat + 0.01,
      end_lng: lng + 0.01,
      start_time: "2026-06-01T09:00:00Z",
      end_time: "2026-06-01T17:00:00Z",
      route_polyline: "test_polyline",
      notes: "Integration test route",
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to insert route: ${error.message}`);
  createdRouteIds.push(data.id);
  return data;
}

async function callPublish(routeId: string) {
  const req = new Request(`http://localhost/api/routes/${routeId}/publish`, {
    method: "PATCH",
  });
  const ctx = { params: Promise.resolve({ id: routeId }) };
  return PATCH(req, ctx);
}

afterAll(async () => {
  await supabase.from("notification_log").delete().in("route_id", createdRouteIds.length ? createdRouteIds : ["__none__"]);
  await supabase.from("route_responses").delete().in("route_id", createdRouteIds.length ? createdRouteIds : ["__none__"]);
  await supabase.from("routes").delete().in("id", createdRouteIds.length ? createdRouteIds : ["__none__"]);
  await supabase.from("farmers").delete().in("id", createdFarmerIds.length ? createdFarmerIds : ["__none__"]);
  await supabase.from("hubs").delete().in("id", createdHubIds.length ? createdHubIds : ["__none__"]);
});

describe("PATCH /api/routes/:id/publish — integration", () => {
  let hub: Awaited<ReturnType<typeof insertTestHub>>;

  beforeAll(async () => {
    hub = await insertTestHub();
  });

  it("finds nearby farmer, sends SMS, logs notification, marks route published", async () => {
    const farmer = await insertTestFarmer(
      "0001",
      ALBUQUERQUE_LAT + FARMER_OFFSET,
      ALBUQUERQUE_LNG + FARMER_OFFSET,
    );
    const route = await insertTestRoute(hub.id, ALBUQUERQUE_LAT, ALBUQUERQUE_LNG);

    const response = await callPublish(route.id);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.farmers_notified).toBeGreaterThanOrEqual(1);
    expect(json.notifications.length).toBeGreaterThanOrEqual(1);

    const routeCheck = await supabase
      .from("routes")
      .select("published")
      .eq("id", route.id)
      .single();
    expect(routeCheck.data?.published).toBe(true);

    const { data: logs } = await supabase
      .from("notification_log")
      .select("*")
      .eq("route_id", route.id);
    expect(logs).toBeDefined();
    expect(logs!.length).toBeGreaterThanOrEqual(1);

    const farmerLog = logs!.find((l) => l.farmer_id === farmer.id);
    expect(farmerLog).toBeDefined();
    expect(farmerLog!.status).toBe("sent");
  });

  it("publishes route with 0 notifications when no farmers are nearby", async () => {
    const route = await insertTestRoute(hub.id, 0, 0);

    const response = await callPublish(route.id);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.farmers_notified).toBe(0);
    expect(json.notifications).toHaveLength(0);

    const routeCheck = await supabase
      .from("routes")
      .select("published")
      .eq("id", route.id)
      .single();
    expect(routeCheck.data?.published).toBe(true);
  });

  it("returns 404 for nonexistent route", async () => {
    const response = await callPublish("00000000-0000-0000-0000-000000000000");
    expect(response.status).toBe(404);
  });

  it("returns 409 when route is already published", async () => {
    const route = await insertTestRoute(hub.id, ALBUQUERQUE_LAT, ALBUQUERQUE_LNG);

    const first = await callPublish(route.id);
    expect(first.status).toBe(200);

    const second = await callPublish(route.id);
    expect(second.status).toBe(409);
  });

  it("notification_log entries link correct route and farmer", async () => {
    const farmer = await insertTestFarmer(
      "0002",
      ALBUQUERQUE_LAT + FARMER_OFFSET,
      ALBUQUERQUE_LNG + FARMER_OFFSET,
    );
    const route = await insertTestRoute(hub.id, ALBUQUERQUE_LAT, ALBUQUERQUE_LNG);

    await callPublish(route.id);

    const { data: logs } = await supabase
      .from("notification_log")
      .select("*")
      .eq("route_id", route.id)
      .eq("farmer_id", farmer.id);
    expect(logs).toBeDefined();
    expect(logs!.length).toBe(1);
    expect(logs![0].route_id).toBe(route.id);
    expect(logs![0].farmer_id).toBe(farmer.id);
  });

  it("proximity filter: notifies nearby farmer, skips distant farmer", async () => {
    // Clean up any stray test farmers near Albuquerque from other test files
    // (e.g. stats.test.ts seeds a farmer at 35.085,-106.651 with +15052267999).
    const KNOWN_CONTAMINANT_PHONES = ["+15052267999", "+15052267952"];
    for (const phone of KNOWN_CONTAMINANT_PHONES) {
      const { data: priorFarmers } = await supabase.from("farmers").select("id").eq("phone", phone);
      const priorIds = (priorFarmers ?? []).map((f) => f.id);
      if (priorIds.length) {
        await supabase.from("notification_log").delete().in("farmer_id", priorIds);
        await supabase.from("route_responses").delete().in("farmer_id", priorIds);
        await supabase.from("farmers").delete().in("id", priorIds);
      }
    }

    // Near farmer uses the verified phone (will actually receive SMS)
    const nearFarmer = await insertTestFarmer(
      "near",
      ALBUQUERQUE_LAT + FARMER_OFFSET,
      ALBUQUERQUE_LNG + FARMER_OFFSET,
    );

    // Distant farmer ~700 miles away (Denver-ish). Should NOT be matched, so
    // SMS is never attempted — its unverified phone doesn't matter.
    const { data: farFarmer, error: farErr } = await supabase
      .from("farmers")
      .insert({
        name: `Test Farmer far ${TEST_TAG}`,
        phone: "+15005550010", // unverified; proximity filter must exclude this row
        address_text: "Far Away",
        latitude: 39.7392,
        longitude: -104.9903,
      })
      .select()
      .single();
    if (farErr) throw new Error(`Failed to insert far farmer: ${farErr.message}`);
    createdFarmerIds.push(farFarmer.id);

    const route = await insertTestRoute(hub.id, ALBUQUERQUE_LAT, ALBUQUERQUE_LNG);

    const response = await callPublish(route.id);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.farmers_notified).toBe(1);

    const { data: logs } = await supabase
      .from("notification_log")
      .select("*")
      .eq("route_id", route.id);
    expect(logs!.length).toBe(1);
    expect(logs![0].farmer_id).toBe(nearFarmer.id);
    expect(logs![0].status).toBe("sent");
    expect(logs!.find((l) => l.farmer_id === farFarmer.id)).toBeUndefined();
  });
});
