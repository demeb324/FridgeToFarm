import { config } from "dotenv";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { GET } from "@/app/api/drivers/[id]/assignments/route";
import type { Database } from "@/lib/supabase/database.types";

config({ path: ".env.local" });

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const HUB_ID = "1e53e9e8-11db-4012-9451-f996632cd250";
const DRIVER_ID = "d0000001-0000-0000-0000-000000000001";
const TEST_TAG = `itest-driver-asgn-${Date.now()}`;
const routeIds: string[] = [];
const assignmentIds: string[] = [];

async function insertRoute(title: string) {
  const { data, error } = await supabase.from("routes").insert({
    hub_id: HUB_ID, title,
    route_polyline: "x", start_lat: 35.08, start_lng: -106.65,
    end_lat: 35.1, end_lng: -106.64,
    start_time: "2026-06-01T09:00:00Z",
    end_time: "2026-06-01T11:00:00Z",
    notes: "10 bins of produce",
  }).select("id").single();
  if (error) throw error;
  routeIds.push(data.id);
  return data.id;
}

async function insertAssignment(routeId: string, status: "assigned" | "started" | "in_progress" | "completed") {
  const { data, error } = await supabase.from("route_assignments").insert({
    route_id: routeId, driver_id: DRIVER_ID, status,
  }).select("id").single();
  if (error) throw error;
  assignmentIds.push(data.id);
  return data.id;
}

beforeAll(async () => {
  const r1 = await insertRoute(`${TEST_TAG} route-1`);
  const r2 = await insertRoute(`${TEST_TAG} route-2`);
  await insertAssignment(r1, "assigned");
  await insertAssignment(r2, "started");
});

afterAll(async () => {
  await supabase.from("route_assignments").delete().in("id", assignmentIds);
  await supabase.from("routes").delete().in("id", routeIds);
});

describe("GET /api/drivers/[id]/assignments", () => {
  it("returns assignments shaped for the UI", async () => {
    const res = await GET(new Request(`http://localhost/api/drivers/${DRIVER_ID}/assignments`), {
      params: Promise.resolve({ id: DRIVER_ID }),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as Array<{
      id: string; routeId: string; routeTitle: string; status: string;
      pickupWindow: string; material: string;
    }>;
    const seeded = json.filter((a) => a.routeTitle.includes(TEST_TAG));
    expect(seeded.length).toBe(2);
    expect(seeded[0].pickupWindow).toContain(":");
    expect(seeded.map((a) => a.status).sort()).toEqual(["Started", "Waiting"]);
  });

  it("400 on invalid driver id", async () => {
    const res = await GET(new Request("http://localhost/api/drivers/nope/assignments"), {
      params: Promise.resolve({ id: "nope" }),
    });
    expect(res.status).toBe(400);
  });
});
