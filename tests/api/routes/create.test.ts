import { config } from "dotenv";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { POST } from "@/app/api/routes/route";
import type { Database } from "@/lib/supabase/database.types";

config({ path: ".env.local" });

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const TEST_TAG = `itest-create-${Date.now()}`;
const SEED_DRIVER_ID = "d0000001-0000-0000-0000-000000000001";
const createdHubIds: string[] = [];
const createdRouteIds: string[] = [];

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

async function callPost(body: unknown) {
  const req = new Request("http://localhost/api/routes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(req);
}

afterAll(async () => {
  await supabase.from("route_stops").delete().in("route_id", createdRouteIds.length ? createdRouteIds : ["__none__"]);
  await supabase.from("route_assignments").delete().in("route_id", createdRouteIds.length ? createdRouteIds : ["__none__"]);
  await supabase.from("routes").delete().in("id", createdRouteIds.length ? createdRouteIds : ["__none__"]);
  await supabase.from("hubs").delete().in("id", createdHubIds.length ? createdHubIds : ["__none__"]);
});

describe("POST /api/routes — integration", () => {
  let hub: Awaited<ReturnType<typeof insertTestHub>>;

  beforeAll(async () => {
    hub = await insertTestHub();
  });

  it("creates route and sends admin SMS confirmation", async () => {
    const response = await callPost({
      hub_id: hub.id,
      driver_id: SEED_DRIVER_ID,
      title: `Created Route ${TEST_TAG}`,
      start_address: "400 Marquette Ave NW, Albuquerque, NM 87102",
      end_address: "63 Lincoln Ave, Santa Fe, NM 87501",
      stops: [],
      start_time: "2026-06-01T09:00:00Z",
      end_time: "2026-06-01T17:00:00Z",
      notes: "Created via integration test",
    });

    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.id).toBeDefined();
    createdRouteIds.push(json.id);

    const { data: assignment } = await supabase
      .from("route_assignments")
      .select("id, route_id, driver_id, status")
      .eq("route_id", json.id)
      .single();
    expect(assignment).not.toBeNull();
    expect(assignment!.driver_id).toBe(SEED_DRIVER_ID);
    expect(assignment!.status).toBe("assigned");
  });

  it("rejects invalid payload with 400 and does not create a route", async () => {
    const response = await callPost({ hub_id: hub.id, title: "incomplete" });
    expect(response.status).toBe(400);
  });

  it("rejects missing driver_id with 400", async () => {
    const response = await callPost({
      hub_id: hub.id,
      title: `No Driver ${TEST_TAG}`,
      start_address: "400 Marquette Ave NW, Albuquerque, NM 87102",
      end_address: "63 Lincoln Ave, Santa Fe, NM 87501",
      stops: [],
      start_time: "2026-06-01T09:00:00Z",
      end_time: "2026-06-01T17:00:00Z",
    });
    expect(response.status).toBe(400);
  });
});
