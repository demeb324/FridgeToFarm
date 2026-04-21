// tests/api/drivers/[id]/assignments/[assignmentId]/patch.test.ts
import { config } from "dotenv";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { PATCH } from "@/app/api/drivers/[id]/assignments/[assignmentId]/route";
import type { Database } from "@/lib/supabase/database.types";

config({ path: ".env.local" });

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const HUB_ID = "1e53e9e8-11db-4012-9451-f996632cd250";
const DRIVER_ID = "d0000001-0000-0000-0000-000000000001";
const TEST_TAG = `itest-asgn-patch-${Date.now()}`;
let routeId = "";
let assignmentId = "";

beforeAll(async () => {
  const { data: r } = await supabase.from("routes").insert({
    hub_id: HUB_ID, title: `${TEST_TAG} patch`,
    route_polyline: "x", start_lat: 35.08, start_lng: -106.65,
    end_lat: 35.1, end_lng: -106.64,
    start_time: "2026-06-01T09:00:00Z",
    end_time: "2026-06-01T11:00:00Z",
  }).select("id").single();
  routeId = r!.id;
  const { data: a } = await supabase.from("route_assignments").insert({
    route_id: routeId, driver_id: DRIVER_ID, status: "assigned",
  }).select("id").single();
  assignmentId = a!.id;
});

afterAll(async () => {
  await supabase.from("route_assignments").delete().eq("id", assignmentId);
  await supabase.from("routes").delete().eq("id", routeId);
});

function req(body: unknown) {
  return new Request(`http://localhost/api/drivers/${DRIVER_ID}/assignments/${assignmentId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/drivers/[id]/assignments/[assignmentId]", () => {
  it("accepts UI-cased status and stores snake_case", async () => {
    const res = await PATCH(req({ status: "In Progress" }), {
      params: Promise.resolve({ id: DRIVER_ID, assignmentId }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("In Progress");
    const { data } = await supabase.from("route_assignments")
      .select("status").eq("id", assignmentId).single();
    expect(data!.status).toBe("in_progress");
  });

  it("rejects unknown status with 400", async () => {
    const res = await PATCH(req({ status: "Bogus" }), {
      params: Promise.resolve({ id: DRIVER_ID, assignmentId }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects assignment that doesn't belong to driver with 404", async () => {
    const res = await PATCH(req({ status: "Started" }), {
      params: Promise.resolve({ id: "d0000002-0000-0000-0000-000000000002", assignmentId }),
    });
    expect(res.status).toBe(404);
  });
});
