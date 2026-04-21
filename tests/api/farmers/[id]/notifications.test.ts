import { config } from "dotenv";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { GET } from "@/app/api/farmers/[id]/notifications/route";
import type { Database } from "@/lib/supabase/database.types";

config({ path: ".env.local" });

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const HUB_ID = "1e53e9e8-11db-4012-9451-f996632cd250";
const TAG = `itest-notif-${Date.now()}`;
let farmerId = "";
let routeId = "";
const logIds: string[] = [];

beforeAll(async () => {
  const { data: prior } = await supabase.from("farmers").select("id").eq("phone", "+15052267997");
  const priorIds = (prior ?? []).map((f) => f.id);
  if (priorIds.length) {
    await supabase.from("notification_log").delete().in("farmer_id", priorIds);
    await supabase.from("route_responses").delete().in("farmer_id", priorIds);
    await supabase.from("farmers").delete().in("id", priorIds);
  }

  const { data: f } = await supabase.from("farmers").insert({
    name: `Notif Farmer ${TAG}`, phone: "+15052267997",
    address_text: "addr", latitude: 35.085, longitude: -106.651,
  }).select("id").single();
  farmerId = f!.id;

  const { data: r } = await supabase.from("routes").insert({
    hub_id: HUB_ID, title: `${TAG} notif-route`, route_polyline: "x",
    start_lat: 35.085, start_lng: -106.651,
    end_lat: 35.09, end_lng: -106.65,
    start_time: "2026-06-01T09:00:00Z",
    end_time: "2026-06-01T11:00:00Z",
    published: true,
  }).select("id").single();
  routeId = r!.id;

  const older = await supabase.from("notification_log").insert({
    route_id: routeId, farmer_id: farmerId, status: "sent", twilio_sid: "SM_older",
  }).select("id").single();
  logIds.push(older.data!.id);

  await new Promise((res) => setTimeout(res, 10));

  const newer = await supabase.from("notification_log").insert({
    route_id: routeId, farmer_id: farmerId, status: "sent", twilio_sid: "SM_newer",
  }).select("id").single();
  logIds.push(newer.data!.id);
});

afterAll(async () => {
  await supabase.from("notification_log").delete().in("id", logIds);
  await supabase.from("routes").delete().eq("id", routeId);
  await supabase.from("farmers").delete().eq("id", farmerId);
});

describe("GET /api/farmers/[id]/notifications", () => {
  it("returns log rows in descending order, shaped for UI", async () => {
    const res = await GET(new Request(`http://localhost/api/farmers/${farmerId}/notifications`), {
      params: Promise.resolve({ id: farmerId }),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as Array<{ id: string; sender: string; message: string; timestamp: string }>;
    expect(json.length).toBeGreaterThanOrEqual(2);
    expect(json[0].id).toBe(logIds[1]);  // newer first
    expect(json[1].id).toBe(logIds[0]);
  });

  it("400 on invalid farmer id", async () => {
    const res = await GET(new Request("http://localhost/api/farmers/nope/notifications"), {
      params: Promise.resolve({ id: "nope" }),
    });
    expect(res.status).toBe(400);
  });
});
