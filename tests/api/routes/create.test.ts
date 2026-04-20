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
      title: `Created Route ${TEST_TAG}`,
      route_polyline: "test_polyline",
      start_lat: 35.0844,
      start_lng: -106.6504,
      end_lat: 35.1,
      end_lng: -106.64,
      start_time: "2026-06-01T09:00:00Z",
      end_time: "2026-06-01T17:00:00Z",
      notes: "Created via integration test",
    });

    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.id).toBeDefined();
    createdRouteIds.push(json.id);

    // Verify SMS was delivered via Twilio API — mirrors publish test pattern.
    const twilio = (await import("twilio")).default(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!,
    );
    // Poll briefly — Twilio's message list has a small ingestion lag.
    let messages = await twilio.messages.list({ to: "+15052267853", limit: 10 });
    let match = messages.find((m) => m.body?.includes(json.title));
    for (let i = 0; i < 5 && !match; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      messages = await twilio.messages.list({ to: "+15052267853", limit: 10 });
      match = messages.find((m) => m.body?.includes(json.title));
    }
    expect(match, "admin SMS containing route title was not found at Twilio").toBeDefined();
    expect(match!.body).toContain(hub.name);
    expect(match!.body).toContain(hub.phone);
  }, 30_000);

  it("rejects invalid payload with 400 and does not create a route", async () => {
    const response = await callPost({ hub_id: hub.id, title: "incomplete" });
    expect(response.status).toBe(400);
  });
});
