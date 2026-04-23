import { config } from "dotenv";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { DELETE } from "@/app/api/routes/[id]/route";
import type { Database } from "@/lib/supabase/database.types";

config({ path: ".env.local" });

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const TEST_TAG = `itest-del-${Date.now()}`;
const createdHubIds: string[] = [];
const createdDriverIds: string[] = [];
const createdFarmerIds: string[] = [];

async function insertHub() {
  const { data, error } = await supabase
    .from("hubs")
    .insert({ name: `Hub ${TEST_TAG}`, phone: "+15559990002", email: `${TEST_TAG}@example.com` })
    .select().single();
  if (error) throw error;
  createdHubIds.push(data.id);
  return data;
}

async function insertDriver(hubId: string) {
  const { data, error } = await supabase
    .from("drivers")
    .insert({
      hub_id: hubId,
      first_name: `Drv`,
      last_name: TEST_TAG,
      phone: `+15559${Math.floor(100000 + Math.random() * 899999)}`,
    })
    .select().single();
  if (error) throw error;
  createdDriverIds.push(data.id);
  return data;
}

async function insertFarmer() {
  const { data, error } = await supabase
    .from("farmers")
    .insert({
      name: `Farmer ${TEST_TAG}`,
      phone: `+15559${Math.floor(100000 + Math.random() * 899999)}`,
      address_text: "x",
      latitude: 35.0, longitude: -106.6,
    })
    .select().single();
  if (error) throw error;
  createdFarmerIds.push(data.id);
  return data;
}

async function insertRoute(hubId: string) {
  const { data, error } = await supabase
    .from("routes")
    .insert({
      title: `Route ${TEST_TAG}`,
      hub_id: hubId,
      start_lat: 35.0, start_lng: -106.6,
      end_lat: 35.1, end_lng: -106.5,
      start_time: "2026-06-01T09:00:00Z",
      end_time: "2026-06-01T17:00:00Z",
      route_polyline: "test",
    })
    .select().single();
  if (error) throw error;
  return data;
}

async function callDelete(routeId: string) {
  const req = new Request(`http://localhost/api/routes/${routeId}`, { method: "DELETE" });
  const ctx = { params: Promise.resolve({ id: routeId }) };
  return DELETE(req, ctx);
}

afterAll(async () => {
  await supabase.from("farmers").delete().in("id", createdFarmerIds.length ? createdFarmerIds : ["__none__"]);
  await supabase.from("drivers").delete().in("id", createdDriverIds.length ? createdDriverIds : ["__none__"]);
  await supabase.from("hubs").delete().in("id", createdHubIds.length ? createdHubIds : ["__none__"]);
});

describe("DELETE /api/routes/:id — integration", () => {
  let hub: Awaited<ReturnType<typeof insertHub>>;

  beforeAll(async () => {
    hub = await insertHub();
  });

  it("deletes route and cascades route_assignments + notification_log", async () => {
    const driver = await insertDriver(hub.id);
    const farmer = await insertFarmer();
    const route = await insertRoute(hub.id);

    await supabase.from("route_assignments").insert({
      route_id: route.id, driver_id: driver.id, status: "assigned",
    });
    await supabase.from("notification_log").insert({
      route_id: route.id, farmer_id: farmer.id, status: "sent",
    });

    const res = await callDelete(route.id);
    expect(res.status).toBe(204);

    const { data: rGone } = await supabase.from("routes").select("id").eq("id", route.id).maybeSingle();
    expect(rGone).toBeNull();

    const { data: aGone } = await supabase.from("route_assignments").select("id").eq("route_id", route.id);
    expect(aGone).toEqual([]);

    const { data: nGone } = await supabase.from("notification_log").select("id").eq("route_id", route.id);
    expect(nGone).toEqual([]);
  });

  it("returns 404 for nonexistent route", async () => {
    const res = await callDelete("00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
  });
});
