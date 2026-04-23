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

const TEST_TAG = `itest-create-addr-${Date.now()}`;
const SEED_DRIVER_ID = "d0000001-0000-0000-0000-000000000001";
const createdHubIds: string[] = [];
const createdRouteIds: string[] = [];

async function insertTestHub() {
  const { data, error } = await supabase
    .from("hubs")
    .insert({
      name: `Test Hub ${TEST_TAG}`,
      phone: "+15559990010",
      email: `addr-${TEST_TAG}@example.com`,
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

describe("POST /api/routes — address-based", () => {
  let hub: Awaited<ReturnType<typeof insertTestHub>>;

  beforeAll(async () => {
    hub = await insertTestHub();
  });

  it("creates route with start/end addresses and no stops", async () => {
    const res = await callPost({
      hub_id: hub.id,
      driver_id: SEED_DRIVER_ID,
      title: `Address Route ${TEST_TAG}`,
      start_address: "400 Marquette Ave NW, Albuquerque, NM 87102",
      end_address: "63 Lincoln Ave, Santa Fe, NM 87501",
      stops: [],
      start_time: "2026-07-01T09:00:00Z",
      end_time: "2026-07-01T17:00:00Z",
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBeDefined();
    expect(json.start_address).toBe("400 Marquette Ave NW, Albuquerque, NM 87102");
    expect(json.end_address).toBe("63 Lincoln Ave, Santa Fe, NM 87501");
    expect(typeof json.start_lat).toBe("number");
    expect(typeof json.start_lng).toBe("number");
    expect(json.route_polyline).toBeTruthy();
    expect(json.route_stops).toHaveLength(0);
    createdRouteIds.push(json.id);
  });

  it("creates route with one stop and persists it", async () => {
    const res = await callPost({
      hub_id: hub.id,
      driver_id: SEED_DRIVER_ID,
      title: `Stops Route ${TEST_TAG}`,
      start_address: "400 Marquette Ave NW, Albuquerque, NM 87102",
      end_address: "63 Lincoln Ave, Santa Fe, NM 87501",
      stops: [{ address: "1 Bernalillo Town Center, Bernalillo, NM 87004", name: "Bernalillo" }],
      start_time: "2026-07-01T09:00:00Z",
      end_time: "2026-07-01T17:00:00Z",
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    createdRouteIds.push(json.id);
    expect(json.route_stops).toHaveLength(1);
    expect(json.route_stops[0].order_index).toBe(0);
    expect(json.route_stops[0].name).toBe("Bernalillo");
    expect(typeof json.route_stops[0].latitude).toBe("number");
  });

  it("rejects with 422 when start_address geocode fails", async () => {
    const { vi } = await import("vitest");
    const prevFetch = globalThis.fetch;
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (typeof url === "string" && url.includes("maps.googleapis.com")) {
        return new Response(JSON.stringify({ status: "ZERO_RESULTS", results: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return prevFetch(input, init);
    });
    try {
      const res = await callPost({
        hub_id: hub.id,
        driver_id: SEED_DRIVER_ID,
        title: `Bad Address ${TEST_TAG}`,
        start_address: "Totally Fake Street That Does Not Exist, ZZ 99999",
        end_address: "63 Lincoln Ave, Santa Fe, NM 87501",
        stops: [],
        start_time: "2026-07-01T09:00:00Z",
        end_time: "2026-07-01T17:00:00Z",
      });
      expect(res.status).toBe(422);
      const json = await res.json();
      expect(json.field).toBe("start_address");
      expect(typeof json.message).toBe("string");
    } finally {
      vi.stubGlobal("fetch", prevFetch);
    }
  });

  it("rejects with 422 when a stop address geocode fails, identifying the index", async () => {
    const { vi } = await import("vitest");
    const prevFetch = globalThis.fetch;
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (typeof url === "string" && url.includes("maps.googleapis.com")) {
        if (url.includes("/geocode/") && url.includes(encodeURIComponent("Nonexistent Place 00000"))) {
          return new Response(JSON.stringify({ status: "ZERO_RESULTS", results: [] }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        if (url.includes("/geocode/")) {
          return new Response(
            JSON.stringify({ status: "OK", results: [{ geometry: { location: { lat: 35.08, lng: -106.65 } } }] }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
      }
      if (typeof url === "string" && url.includes("routes.googleapis.com")) {
        return new Response(
          JSON.stringify({ routes: [{ polyline: { encodedPolyline: "mock_polyline" } }] }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return prevFetch(input, init);
    });
    try {
      const res = await callPost({
        hub_id: hub.id,
        driver_id: SEED_DRIVER_ID,
        title: `Bad Stop ${TEST_TAG}`,
        start_address: "400 Marquette Ave NW, Albuquerque, NM 87102",
        end_address: "63 Lincoln Ave, Santa Fe, NM 87501",
        stops: [{ address: "Nonexistent Place 00000" }],
        start_time: "2026-07-01T09:00:00Z",
        end_time: "2026-07-01T17:00:00Z",
      });
      expect(res.status).toBe(422);
      const json = await res.json();
      expect(json.field).toBe("stops[0].address");
    } finally {
      vi.stubGlobal("fetch", prevFetch);
    }
  });

  it("rejects missing required fields with 400", async () => {
    const res = await callPost({ hub_id: hub.id, title: "incomplete" });
    expect(res.status).toBe(400);
  });
});