// tests/api/routes/publish-flow.test.ts
import { config } from "dotenv";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { POST as createRoute } from "@/app/api/routes/route";
import { PATCH as publishRoute } from "@/app/api/routes/[id]/publish/route";
import type { Database } from "@/lib/supabase/database.types";

config({ path: ".env.local" });

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const HUB_ID = "1e53e9e8-11db-4012-9451-f996632cd250";
const DRIVER_ID = "d0000001-0000-0000-0000-000000000001";
const TAG = `itest-publish-flow-${Date.now()}`;
const TEST_PHONE = "+15052267952"; // arbitrary — SMS is dry-run, not really delivered
let farmerId = "";
let routeId = "";

beforeAll(async () => {
  const { data: prior } = await supabase.from("farmers").select("id").eq("phone", TEST_PHONE);
  const priorIds = (prior ?? []).map((f) => f.id);
  if (priorIds.length) {
    await supabase.from("notification_log").delete().in("farmer_id", priorIds);
    await supabase.from("route_responses").delete().in("farmer_id", priorIds);
    await supabase.from("farmers").delete().in("id", priorIds);
  }
  const { data: f } = await supabase.from("farmers").insert({
    name: `Publish Farmer ${TAG}`, phone: TEST_PHONE,
    address_text: "addr", latitude: 35.0844, longitude: -106.6504,
  }).select("id").single();
  farmerId = f!.id;
});

afterAll(async () => {
  await supabase.from("notification_log").delete().eq("farmer_id", farmerId);
  await supabase.from("route_responses").delete().eq("farmer_id", farmerId);
  if (routeId) {
    await supabase.from("route_assignments").delete().eq("route_id", routeId);
    await supabase.from("routes").delete().eq("id", routeId);
  }
  await supabase.from("farmers").delete().eq("id", farmerId);
});

describe("publish flow: POST /api/routes → PATCH /api/routes/[id]/publish", () => {
  it("creates route, publishes, and logs farmer notification (SMS dry-run)", async () => {
    const createReq = new Request("http://localhost/api/routes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        hub_id: HUB_ID,
        driver_id: DRIVER_ID,
        title: `${TAG} pub-route`,
        route_polyline: "x",
        start_lat: 35.0844, start_lng: -106.6504,
        end_lat: 35.09, end_lng: -106.64,
        start_time: "2026-06-10T09:00:00Z",
        end_time: "2026-06-10T11:00:00Z",
      }),
    });
    const createRes = await createRoute(createReq);
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    routeId = created.id;

    const pubRes = await publishRoute(
      new Request(`http://localhost/api/routes/${routeId}/publish`, { method: "PATCH" }),
      { params: Promise.resolve({ id: routeId }) },
    );
    expect(pubRes.status).toBe(200);
    const pub = await pubRes.json();
    expect(pub.farmers_notified).toBeGreaterThanOrEqual(1);

    const { data: log } = await supabase.from("notification_log")
      .select("id, status, twilio_sid").eq("route_id", routeId).eq("farmer_id", farmerId);
    expect(log!.length).toBeGreaterThanOrEqual(1);
    expect(log![0].status).toBe("sent");
    expect(log![0].twilio_sid).toMatch(/^SM_dryrun_/);
  }, 30_000);
});
