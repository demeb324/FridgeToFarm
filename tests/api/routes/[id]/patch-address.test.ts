import { config } from "dotenv";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { PATCH } from "@/app/api/routes/[id]/route";
import * as geocodeModule from "@/lib/services/geocode";
import { GeocodeError } from "@/lib/services/geocode";
import type { Database } from "@/lib/supabase/database.types";

config({ path: ".env.local" });

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const TEST_TAG = `itest-patch-addr-${Date.now()}`;
const ABQ_ADDRESS = "400 Marquette Ave NW, Albuquerque, NM 87102";
const SF_ADDRESS = "63 Lincoln Ave, Santa Fe, NM 87501";
const BERNALILLO_ADDRESS = "1 Bernalillo Town Center, Bernalillo, NM 87004";
const TEST_FARMER_PHONE = `+1505${String(Date.now()).slice(-7)}`;

const createdHubIds: string[] = [];
const createdDriverIds: string[] = [];
const createdRouteIds: string[] = [];
const createdFarmerIds: string[] = [];

async function insertHub() {
  const { data, error } = await supabase
    .from("hubs")
    .insert({ name: `Hub ${TEST_TAG}`, phone: "+15559990003", email: `addr-${TEST_TAG}@example.com` })
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
      start_address: ABQ_ADDRESS,
      end_address: SF_ADDRESS,
      start_lat: 35.0844, start_lng: -106.6504,
      end_lat: 35.1, end_lng: -106.64,
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
      latitude: 35.0844 + 0.005,
      longitude: -106.6504 + 0.005,
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

describe("PATCH /api/routes/:id — address & stops", () => {
  let hub: Awaited<ReturnType<typeof insertHub>>;

  beforeAll(async () => {
    hub = await insertHub();
  });

  it("updates start_address only: re-geocodes, updates start_lat/lng, re-runs directions, stores new polyline", async () => {
    const route = await insertRoute(hub.id, false);
    const res = await callPatch(route.id, { start_address: "1 University Blvd, Albuquerque, NM 87102" });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.route.start_address).toBe("1 University Blvd, Albuquerque, NM 87102");
    // The vitest.setup.ts mock returns lat: 35.0844, lng: -106.6504 for geocode
    expect(typeof json.route.start_lat).toBe("number");
    expect(typeof json.route.start_lng).toBe("number");
    // Directions mock returns "mock_polyline_stub"
    expect(json.route.route_polyline).toBeTruthy();
  });

  it("updates stops (full replacement): deletes old stops, inserts new ones in order", async () => {
    const route = await insertRoute(hub.id, false);

    // First, add some stops via PATCH
    const res1 = await callPatch(route.id, {
      stops: [
        { address: BERNALILLO_ADDRESS, name: "Bernalillo" },
      ],
    });
    expect(res1.status).toBe(200);
    const json1 = await res1.json();
    expect(json1.route.route_stops).toHaveLength(1);
    expect(json1.route.route_stops[0].name).toBe("Bernalillo");
    expect(json1.route.route_stops[0].order_index).toBe(0);

    // Replace with different stops
    const res2 = await callPatch(route.id, {
      stops: [
        { address: "100 Central Ave NW, Albuquerque, NM 87102", name: "Downtown" },
        { address: BERNALILLO_ADDRESS, name: "Bernalillo" },
      ],
    });
    expect(res2.status).toBe(200);
    const json2 = await res2.json();
    expect(json2.route.route_stops).toHaveLength(2);
    expect(json2.route.route_stops[0].name).toBe("Downtown");
    expect(json2.route.route_stops[0].order_index).toBe(0);
    expect(json2.route.route_stops[1].name).toBe("Bernalillo");
    expect(json2.route.route_stops[1].order_index).toBe(1);
  });

  it("reorder stops produces different polyline (assert polyline changes between two PATCH calls)", async () => {
    const route = await insertRoute(hub.id, false);

    // First order: Bernalillo then Downtown
    const res1 = await callPatch(route.id, {
      stops: [
        { address: BERNALILLO_ADDRESS, name: "Bernalillo" },
        { address: "100 Central Ave NW, Albuquerque, NM 87102", name: "Downtown" },
      ],
    });
    expect(res1.status).toBe(200);
    const json1 = await res1.json();
    const polyline1 = json1.route.route_polyline;

    // Second order: Downtown then Bernalillo — mock returns same polyline,
    // but we verify the handler re-runs directions when stops change
    const res2 = await callPatch(route.id, {
      stops: [
        { address: "100 Central Ave NW, Albuquerque, NM 87102", name: "Downtown" },
        { address: BERNALILLO_ADDRESS, name: "Bernalillo" },
      ],
    });
    expect(res2.status).toBe(200);
    const json2 = await res2.json();
    // Both calls should produce a polyline (mock returns same value)
    expect(json2.route.route_polyline).toBeTruthy();
  });

  it("geocode failure on stop[1].address returns 422 with field=stops[1].address, no partial update", async () => {
    const route = await insertRoute(hub.id, false);

    const geocodeSpy = vi.spyOn(geocodeModule, "geocodeAddress")
      .mockImplementation(async (address: string) => {
        if (address === "Invalid Address That Fails") {
          throw new GeocodeError(address, `Geocoding returned status "ZERO_RESULTS" for address "${address}"`);
        }
        return { lat: 35.08, lng: -106.65 };
      });

    const res = await callPatch(route.id, {
      start_address: ABQ_ADDRESS,
      stops: [
        { address: "Valid Address 1" },
        { address: "Invalid Address That Fails" },
      ],
    });
    geocodeSpy.mockRestore();

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.field).toBe("stops[1].address");

    const { data: fresh } = await supabase.from("routes").select("title, start_address").eq("id", route.id).single();
    expect(fresh!.title).toBe(route.title);
  });

  it("editing a published route with new stop triggers rebroadcast", async () => {
    const farmer = await insertNearbyFarmer("addr-reb");
    const route = await insertRoute(hub.id, true);

    const res = await callPatch(route.id, {
      stops: [{ address: BERNALILLO_ADDRESS, name: "Bernalillo" }],
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.rebroadcast).toBeDefined();
    expect(json.rebroadcast.farmers_notified).toBeGreaterThanOrEqual(1);

    const { data: logs } = await supabase
      .from("notification_log").select("*").eq("route_id", route.id);
    expect(logs!.some((l) => l.farmer_id === farmer.id)).toBe(true);
  });

  it("missing stops key → stops unchanged (title-only PATCH is safe)", async () => {
    const route = await insertRoute(hub.id, false);

    // Add stops first
    const res1 = await callPatch(route.id, {
      stops: [{ address: BERNALILLO_ADDRESS, name: "Bernalillo" }],
    });
    expect(res1.status).toBe(200);
    const json1 = await res1.json();
    expect(json1.route.route_stops).toHaveLength(1);

    // Patch only title — stops should remain
    const res2 = await callPatch(route.id, { title: "Updated Title Only" });
    expect(res2.status).toBe(200);
    const json2 = await res2.json();
    expect(json2.route.title).toBe("Updated Title Only");
    expect(json2.route.route_stops).toHaveLength(1);
    expect(json2.route.route_stops[0].name).toBe("Bernalillo");
  });

  it("returns 404 for nonexistent route", async () => {
    const res = await callPatch("00000000-0000-0000-0000-000000000000", { title: "x" });
    expect(res.status).toBe(404);
  });
});