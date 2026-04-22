# Multi-Route Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-04-21-multi-route-planner-design.md`

**Goal:** Convert `/routes` from single-route builder into a multi-route management view (list + map + editor) with full CRUD and auto SMS re-broadcast on published-route edits.

**Architecture:** Extract the inlined publish logic into a `publishRoute` service so new PATCH endpoint can re-use it. Add PATCH and DELETE handlers under `app/api/routes/[id]/`. On the frontend, decompose the 766-line `components/google-route-planner.tsx` into four focused components (`route-planner-shell`, `route-list`, `route-map`, `route-editor`) plus a pure `route-color` helper. Seed existing demo scenarios as real DB rows so the page loads from a single source of truth.

**Tech Stack:** Next.js 16 App Router (client components), TanStack Query v5, `@vis.gl/react-google-maps`, Supabase (hosted project), Vitest integration tests, Zod-free lightweight validators in `lib/api/validation.ts`.

---

## File Structure

**Backend — new/changed files:**

| File | Responsibility |
|------|----------------|
| `lib/services/publish-route.ts` (new) | `publishRoute(routeId)` — proximity match, SMS send, notification log, mark published. Pure service, no HTTP. |
| `app/api/routes/[id]/publish/route.ts` (modify) | Becomes a thin wrapper around `publishRoute`. |
| `app/api/routes/[id]/route.ts` (new) | `PATCH` (update fields + re-broadcast if published) and `DELETE` (cascade removal). |
| `supabase/migrations/20260421160000_seed_demo_routes.sql` (new) | Seeds two real routes for `DEMO_HUB_ID` matching existing scenarios, assigns to `DEMO_DRIVER_ID`. |
| `tests/api/routes/[id]/patch.test.ts` (new) | Integration tests for PATCH. |
| `tests/api/routes/[id]/delete.test.ts` (new) | Integration tests for DELETE. |

**Frontend — new/changed files:**

| File | Responsibility |
|------|----------------|
| `lib/routes/route-color.ts` (new) | `routeColor(routeId): string` deterministic hash-to-HSL. Pure, unit-testable. |
| `lib/routes/route-color.test.ts` (new) | Unit tests for the helper. |
| `components/routes/route-list.tsx` (new) | Left column: list rows + "+ New route" button. Presentational. |
| `components/routes/route-map.tsx` (new) | Center: `APIProvider` + `Map` + pins for all + polyline/markers for selected. |
| `components/routes/route-editor.tsx` (new) | Right column: form with view/create modes + save/delete. |
| `components/routes/route-planner-shell.tsx` (new) | Three-column layout. Owns `selectedRouteId`, `mode`, mutations. |
| `lib/api/client.ts` (modify) | Add `updateRoute`, `deleteRoute`, update `listRoutes` return type. |
| `app/routes/page.tsx` (modify) | Mount `<RoutePlannerShell />`. Remove scenarios import. |
| `components/google-route-planner.tsx` (delete) | Replaced by the four-component split. |
| `lib/config/scenarios.ts` (delete) | Replaced by DB seed. |

---

## Task 1: Extract `publishRoute` service

**Context:** Today, `app/api/routes/[id]/publish/route.ts` inlines proximity matching + SMS + notification logging + mark-published. The new PATCH endpoint needs to run the same flow on published-route edits. Extract into a service so both callers share one implementation.

**Files:**
- Create: `lib/services/publish-route.ts`
- Modify: `app/api/routes/[id]/publish/route.ts`
- Test (existing, must keep passing): `tests/api/routes/[id]/publish.test.ts`

- [ ] **Step 1: Create the service module**

Write `lib/services/publish-route.ts`:

```ts
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { sendSms, formatRouteSmsMessage } from "@backend/services/sms";

export type PublishNotification = {
  farmer_id: string;
  farmer_name: string;
  status: "sent" | "failed";
};

export type PublishRouteResult = {
  route: Record<string, unknown> & { id: string; published: boolean };
  farmers_notified: number;
  notifications: PublishNotification[];
};

export type PublishRouteError =
  | { kind: "not_found" }
  | { kind: "already_published" }
  | { kind: "proximity_failed"; message: string }
  | { kind: "update_failed"; message: string };

/**
 * Runs proximity match → SMS → notification_log → mark published.
 *
 * When `allowRepublish: true`, the already-published guard is skipped and the
 * route is re-broadcast as-is (used by PATCH when editing a published route).
 */
export async function publishRoute(
  routeId: string,
  opts: { allowRepublish?: boolean } = {},
): Promise<{ ok: true; value: PublishRouteResult } | { ok: false; error: PublishRouteError }> {
  const supabase = createAdminSupabaseClient();

  const { data: route, error: routeError } = await supabase
    .from("routes")
    .select("*, hubs ( id, name, phone, email )")
    .eq("id", routeId)
    .single();

  if (routeError || !route) {
    return { ok: false, error: { kind: "not_found" } };
  }

  if (route.published && !opts.allowRepublish) {
    return { ok: false, error: { kind: "already_published" } };
  }

  console.log(`[publishRoute] Publishing ${routeId}: "${route.title}"`);

  const routePoints = [
    { lat: route.start_lat, lng: route.start_lng },
    { lat: route.end_lat, lng: route.end_lng },
  ];

  const { data: matchedFarmers, error: matchError } = await supabase.rpc(
    "find_farmers_near_route_points",
    { route_points: routePoints, radius_miles: 10 },
  );

  if (matchError) {
    console.error(`[publishRoute] Proximity matching failed:`, matchError);
    return { ok: false, error: { kind: "proximity_failed", message: matchError.message } };
  }

  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  const hub = route.hubs;
  const routeDate = new Date(route.start_time).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const notifications: PublishNotification[] = [];

  for (const farmer of matchedFarmers ?? []) {
    const responseUrl = `${baseUrl}/respond?route=${routeId}&farmer=${farmer.farmer_id}`;
    const message = formatRouteSmsMessage({
      hubName: hub.name,
      routeDate,
      responseUrl,
      hubPhone: hub.phone,
      hubEmail: hub.email,
    });

    const smsResult = await sendSms(farmer.phone, message);

    await supabase.from("notification_log").insert({
      route_id: routeId,
      farmer_id: farmer.farmer_id,
      status: smsResult.status === "sent" ? "sent" : "failed",
      twilio_sid: smsResult.sid || null,
      error_message: smsResult.error || null,
    });

    notifications.push({
      farmer_id: farmer.farmer_id,
      farmer_name: farmer.farmer_name,
      status: smsResult.status === "sent" ? "sent" : "failed",
    });
  }

  const { data: updated, error: updateError } = await supabase
    .from("routes")
    .update({ published: true })
    .eq("id", routeId)
    .select("*, hubs ( id, name, phone, email )")
    .single();

  if (updateError) {
    return { ok: false, error: { kind: "update_failed", message: updateError.message } };
  }

  const sentCount = notifications.filter((n) => n.status === "sent").length;
  console.log(`[publishRoute] ${routeId} done: ${sentCount} sent, ${notifications.length - sentCount} failed`);

  return {
    ok: true,
    value: {
      route: updated as PublishRouteResult["route"],
      farmers_notified: sentCount,
      notifications,
    },
  };
}
```

- [ ] **Step 2: Rewrite the publish handler to use the service**

Replace the body of `app/api/routes/[id]/publish/route.ts`:

```ts
import { NextResponse } from "next/server";
import { publishRoute } from "@/lib/services/publish-route";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: "Route id is required." }, { status: 400 });
  }

  const result = await publishRoute(id);

  if (!result.ok) {
    switch (result.error.kind) {
      case "not_found":
        return NextResponse.json({ error: "Route not found." }, { status: 404 });
      case "already_published":
        return NextResponse.json({ error: "Route already published." }, { status: 409 });
      case "proximity_failed":
        return NextResponse.json({ error: "Proximity matching failed." }, { status: 500 });
      case "update_failed":
        return NextResponse.json({ error: result.error.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    route: result.value.route,
    farmers_notified: result.value.farmers_notified,
    notifications: result.value.notifications,
  });
}
```

- [ ] **Step 3: Run existing publish tests to confirm no regression**

Run: `npx vitest run tests/api/routes/[id]/publish.test.ts`
Expected: PASS (all 6 existing tests green).

- [ ] **Step 4: Commit**

```bash
git add lib/services/publish-route.ts app/api/routes/[id]/publish/route.ts
git commit -m "refactor: extract publishRoute service from publish endpoint"
```

---

## Task 2: `route-color` helper + unit test

**Files:**
- Create: `lib/routes/route-color.ts`
- Create: `lib/routes/route-color.test.ts`

- [ ] **Step 1: Write the failing test**

`lib/routes/route-color.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { routeColor } from "./route-color";

describe("routeColor", () => {
  it("returns deterministic value for same id", () => {
    expect(routeColor("abc")).toBe(routeColor("abc"));
  });

  it("returns different values for different ids", () => {
    expect(routeColor("abc")).not.toBe(routeColor("xyz"));
  });

  it("returns an hsl() string", () => {
    expect(routeColor("abc")).toMatch(/^hsl\(\d+(\.\d+)?, \d+(\.\d+)?%, \d+(\.\d+)?%\)$/);
  });

  it("returns empty-safe hsl() for empty string", () => {
    expect(routeColor("")).toMatch(/^hsl\(/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/routes/route-color.test.ts`
Expected: FAIL — `Cannot find module './route-color'`.

- [ ] **Step 3: Implement `routeColor`**

`lib/routes/route-color.ts`:

```ts
/**
 * Deterministic hash-to-HSL. Fixed saturation and lightness so colors stay
 * visually balanced on the map regardless of input id.
 */
export function routeColor(routeId: string): string {
  let hash = 2166136261;
  for (let i = 0; i < routeId.length; i++) {
    hash ^= routeId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 45%)`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/routes/route-color.test.ts`
Expected: PASS (4/4).

- [ ] **Step 5: Commit**

```bash
git add lib/routes/route-color.ts lib/routes/route-color.test.ts
git commit -m "feat: deterministic route color helper"
```

---

## Task 3: PATCH `/api/routes/[id]` endpoint

**Files:**
- Create: `app/api/routes/[id]/route.ts`
- Create: `tests/api/routes/[id]/patch.test.ts`

- [ ] **Step 1: Write the failing tests**

`tests/api/routes/[id]/patch.test.ts`:

```ts
import { config } from "dotenv";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { PATCH } from "@/app/api/routes/[id]/route";
import type { Database } from "@/lib/supabase/database.types";

config({ path: ".env.local" });

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const TEST_TAG = `itest-patch-${Date.now()}`;
const ABQ_LAT = 35.0844;
const ABQ_LNG = -106.6504;
const TEST_FARMER_PHONE = "+15052267853";

const createdHubIds: string[] = [];
const createdDriverIds: string[] = [];
const createdRouteIds: string[] = [];
const createdFarmerIds: string[] = [];

async function insertHub() {
  const { data, error } = await supabase
    .from("hubs")
    .insert({ name: `Hub ${TEST_TAG}`, phone: "+15559990001", email: `${TEST_TAG}@example.com` })
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
      start_lat: ABQ_LAT, start_lng: ABQ_LNG,
      end_lat: ABQ_LAT + 0.01, end_lng: ABQ_LNG + 0.01,
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
  // Reuse publish.test pattern: clear any row already holding TEST_FARMER_PHONE.
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
      latitude: ABQ_LAT + 0.005,
      longitude: ABQ_LNG + 0.005,
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
  await supabase.from("route_assignments").delete().in("route_id", createdRouteIds.length ? createdRouteIds : ["__none__"]);
  await supabase.from("routes").delete().in("id", createdRouteIds.length ? createdRouteIds : ["__none__"]);
  await supabase.from("farmers").delete().in("id", createdFarmerIds.length ? createdFarmerIds : ["__none__"]);
  await supabase.from("drivers").delete().in("id", createdDriverIds.length ? createdDriverIds : ["__none__"]);
  await supabase.from("hubs").delete().in("id", createdHubIds.length ? createdHubIds : ["__none__"]);
});

describe("PATCH /api/routes/:id — integration", () => {
  let hub: Awaited<ReturnType<typeof insertHub>>;

  beforeAll(async () => {
    hub = await insertHub();
  });

  it("updates title and notes on unpublished route, returns no rebroadcast", async () => {
    const route = await insertRoute(hub.id, false);
    const res = await callPatch(route.id, { title: "Updated title", notes: "new notes" });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.route.title).toBe("Updated title");
    expect(json.route.notes).toBe("new notes");
    expect(json.rebroadcast).toBeUndefined();
  });

  it("updates driver_id — upserts route_assignments", async () => {
    const route = await insertRoute(hub.id, false);
    const d1 = await insertDriver(hub.id, "A");
    const d2 = await insertDriver(hub.id, "B");

    let res = await callPatch(route.id, { driver_id: d1.id });
    expect(res.status).toBe(200);
    let { data: asgn } = await supabase
      .from("route_assignments").select("*").eq("route_id", route.id);
    expect(asgn).toHaveLength(1);
    expect(asgn![0].driver_id).toBe(d1.id);

    res = await callPatch(route.id, { driver_id: d2.id });
    expect(res.status).toBe(200);
    ({ data: asgn } = await supabase
      .from("route_assignments").select("*").eq("route_id", route.id));
    expect(asgn).toHaveLength(1);
    expect(asgn![0].driver_id).toBe(d2.id);
  });

  it("editing a published route triggers rebroadcast", async () => {
    const farmer = await insertNearbyFarmer("reb");
    const route = await insertRoute(hub.id, true);

    const res = await callPatch(route.id, { title: "Retitled" });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.rebroadcast).toBeDefined();
    expect(json.rebroadcast.farmers_notified).toBeGreaterThanOrEqual(1);

    const { data: logs } = await supabase
      .from("notification_log").select("*").eq("route_id", route.id);
    expect(logs!.some((l) => l.farmer_id === farmer.id)).toBe(true);
  });

  it("returns 404 for nonexistent route", async () => {
    const res = await callPatch("00000000-0000-0000-0000-000000000000", { title: "x" });
    expect(res.status).toBe(404);
  });

  it("returns 400 for malformed body", async () => {
    const route = await insertRoute(hub.id, false);
    const req = new Request(`http://localhost/api/routes/${route.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: "not-json",
    });
    const ctx = { params: Promise.resolve({ id: route.id }) };
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(400);
  });

  it("returns 422 when driver_id references a nonexistent driver", async () => {
    const route = await insertRoute(hub.id, false);
    const res = await callPatch(route.id, { driver_id: "00000000-0000-0000-0000-000000000000" });
    expect(res.status).toBe(422);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/api/routes/[id]/patch.test.ts`
Expected: FAIL — `Cannot find module '@/app/api/routes/[id]/route'`.

- [ ] **Step 3: Implement the PATCH handler**

`app/api/routes/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import {
  asNumber,
  asString,
  isIsoDateTime,
  isLatitude,
  isLongitude,
  isRecord,
} from "@/lib/api/validation";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { publishRoute } from "@/lib/services/publish-route";

type RouteContext = { params: Promise<{ id: string }> };

type MutableFields = {
  title?: string;
  start_lat?: number;
  start_lng?: number;
  end_lat?: number;
  end_lng?: number;
  route_polyline?: string;
  start_time?: string;
  end_time?: string;
  notes?: string | null;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Route id is required." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  if (!isRecord(body)) {
    return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 });
  }

  const updates: MutableFields = {};
  if (body.title !== undefined) {
    const v = asString(body.title);
    if (!v) return NextResponse.json({ error: "title must be a non-empty string." }, { status: 400 });
    updates.title = v;
  }
  if (body.start_lat !== undefined) {
    const v = asNumber(body.start_lat);
    if (!isLatitude(v)) return NextResponse.json({ error: "start_lat invalid." }, { status: 400 });
    updates.start_lat = v;
  }
  if (body.start_lng !== undefined) {
    const v = asNumber(body.start_lng);
    if (!isLongitude(v)) return NextResponse.json({ error: "start_lng invalid." }, { status: 400 });
    updates.start_lng = v;
  }
  if (body.end_lat !== undefined) {
    const v = asNumber(body.end_lat);
    if (!isLatitude(v)) return NextResponse.json({ error: "end_lat invalid." }, { status: 400 });
    updates.end_lat = v;
  }
  if (body.end_lng !== undefined) {
    const v = asNumber(body.end_lng);
    if (!isLongitude(v)) return NextResponse.json({ error: "end_lng invalid." }, { status: 400 });
    updates.end_lng = v;
  }
  if (body.route_polyline !== undefined) {
    const v = asString(body.route_polyline);
    if (!v) return NextResponse.json({ error: "route_polyline invalid." }, { status: 400 });
    updates.route_polyline = v;
  }
  if (body.start_time !== undefined) {
    const v = asString(body.start_time);
    if (!isIsoDateTime(v)) return NextResponse.json({ error: "start_time invalid." }, { status: 400 });
    updates.start_time = v;
  }
  if (body.end_time !== undefined) {
    const v = asString(body.end_time);
    if (!isIsoDateTime(v)) return NextResponse.json({ error: "end_time invalid." }, { status: 400 });
    updates.end_time = v;
  }
  if (body.notes !== undefined) {
    updates.notes = body.notes === null ? null : asString(body.notes) || null;
  }

  const driverId = body.driver_id === undefined ? undefined : asString(body.driver_id);
  if (body.driver_id !== undefined && !driverId) {
    return NextResponse.json({ error: "driver_id must be a non-empty string." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  const { data: existing } = await supabase.from("routes").select("id").eq("id", id).single();
  if (!existing) {
    return NextResponse.json({ error: "Route not found." }, { status: 404 });
  }

  if (driverId) {
    const { data: driver } = await supabase.from("drivers").select("id").eq("id", driverId).single();
    if (!driver) {
      return NextResponse.json({ error: "Driver not found." }, { status: 422 });
    }
  }

  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await supabase.from("routes").update(updates).eq("id", id);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  if (driverId) {
    const { data: existingAssignment } = await supabase
      .from("route_assignments")
      .select("id")
      .eq("route_id", id)
      .maybeSingle();

    if (existingAssignment) {
      await supabase
        .from("route_assignments")
        .update({ driver_id: driverId })
        .eq("id", existingAssignment.id);
    } else {
      await supabase
        .from("route_assignments")
        .insert({ route_id: id, driver_id: driverId, status: "assigned" });
    }
  }

  const { data: updated, error: selectError } = await supabase
    .from("routes")
    .select("*, hubs ( id, name, phone, email )")
    .eq("id", id)
    .single();

  if (selectError || !updated) {
    return NextResponse.json({ error: selectError?.message ?? "Route not found." }, { status: 500 });
  }

  let rebroadcast: { farmers_notified: number; notifications: Array<{ farmer_id: string; status: "sent" | "failed" }> } | undefined;
  if (updated.published) {
    const result = await publishRoute(id, { allowRepublish: true });
    if (result.ok) {
      rebroadcast = {
        farmers_notified: result.value.farmers_notified,
        notifications: result.value.notifications.map((n) => ({ farmer_id: n.farmer_id, status: n.status })),
      };
    } else {
      console.error("[routes.PATCH] rebroadcast failed:", result.error);
    }
  }

  return NextResponse.json({ route: updated, ...(rebroadcast ? { rebroadcast } : {}) });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/api/routes/[id]/patch.test.ts`
Expected: PASS (6/6).

- [ ] **Step 5: Run full test suite to confirm no regression**

Run: `npx vitest run`
Expected: all tests green.

- [ ] **Step 6: Commit**

```bash
git add app/api/routes/[id]/route.ts tests/api/routes/[id]/patch.test.ts
git commit -m "feat(api): PATCH /api/routes/[id] with re-broadcast on published edit"
```

---

## Task 4: DELETE `/api/routes/[id]` endpoint

**Files:**
- Modify: `app/api/routes/[id]/route.ts` (add `DELETE` export)
- Create: `tests/api/routes/[id]/delete.test.ts`

- [ ] **Step 1: Write the failing tests**

`tests/api/routes/[id]/delete.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/api/routes/[id]/delete.test.ts`
Expected: FAIL — `DELETE` not exported from route module.

- [ ] **Step 3: Add the `DELETE` export**

Append to `app/api/routes/[id]/route.ts` (keep existing `PATCH` intact):

```ts
export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Route id is required." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  const { data: existing } = await supabase.from("routes").select("id").eq("id", id).single();
  if (!existing) {
    return NextResponse.json({ error: "Route not found." }, { status: 404 });
  }

  const { error } = await supabase.from("routes").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
```

Note: This relies on the FKs in `route_assignments`, `notification_log`, and `route_responses` being declared with `ON DELETE CASCADE` against `routes.id`. If the test fails because orphaned rows remain, verify the migration `supabase/migrations/20260419130000_initial_schema.sql` declares CASCADE on those FKs — if not, the implementer must issue explicit pre-deletes inside this handler (delete from `notification_log`, `route_responses`, `route_assignments` by `route_id` before the `routes` delete).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/api/routes/[id]/delete.test.ts`
Expected: PASS (2/2). If the cascade test fails, apply the fallback described above.

- [ ] **Step 5: Commit**

```bash
git add app/api/routes/[id]/route.ts tests/api/routes/[id]/delete.test.ts
git commit -m "feat(api): DELETE /api/routes/[id] with cascade cleanup"
```

---

## Task 5: Extend API client

**Files:**
- Modify: `lib/api/client.ts`

- [ ] **Step 1: Add typed wrappers for the new endpoints**

Replace the `api` object in `lib/api/client.ts` (keep all other exports and `http` helper unchanged). Add typed `RouteRow` alongside:

```ts
export type RouteRow = {
  id: string;
  hub_id: string;
  title: string;
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  route_polyline: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  published: boolean;
  created_at: string;
  hubs?: { id: string; name: string; phone: string; email: string } | null;
};

export type RouteUpdatePayload = Partial<{
  title: string;
  driver_id: string;
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  route_polyline: string;
  start_time: string;
  end_time: string;
  notes: string | null;
}>;

export type RebroadcastResult = {
  farmers_notified: number;
  notifications: Array<{ farmer_id: string; status: "sent" | "failed" }>;
};
```

Then, in the `api` object, replace the existing `listRoutes` and append new methods (final object shown in full for clarity — do not delete unrelated methods):

```ts
export const api = {
  listHubs: () => http<HubSummary[]>("/api/hubs"),
  hubStats: (hubId: string) => http<HubStats>(`/api/hubs/${hubId}/stats`),
  listDrivers: (hubId?: string) =>
    http<DriverSummary[]>(hubId ? `/api/drivers?hub_id=${hubId}` : "/api/drivers"),
  listAssignments: (driverId: string) =>
    http<DriverRouteAssignment[]>(`/api/drivers/${driverId}/assignments`),
  updateAssignmentStatus: (driverId: string, assignmentId: string, status: string) =>
    http<{ id: string; status: string }>(
      `/api/drivers/${driverId}/assignments/${assignmentId}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      },
    ),
  listOpportunities: (farmerId: string) =>
    http<FarmerOpportunity[]>(`/api/farmers/${farmerId}/opportunities`),
  listNotifications: (farmerId: string) =>
    http<FarmerNotification[]>(`/api/farmers/${farmerId}/notifications`),
  listRoutes: (hubId?: string) =>
    http<RouteRow[]>(hubId ? `/api/routes?hub_id=${hubId}` : "/api/routes"),
  createRoute: (payload: Record<string, unknown>) =>
    http<RouteRow>("/api/routes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }),
  updateRoute: (routeId: string, payload: RouteUpdatePayload) =>
    http<{ route: RouteRow; rebroadcast?: RebroadcastResult }>(`/api/routes/${routeId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }),
  deleteRoute: (routeId: string) =>
    fetch(`/api/routes/${routeId}`, { method: "DELETE" }).then((r) => {
      if (!r.ok && r.status !== 204) throw new Error(`Delete failed (${r.status})`);
    }),
  publishRoute: (routeId: string) =>
    http<{ farmers_notified: number; notifications: Array<{ status: string }> }>(
      `/api/routes/${routeId}/publish`,
      { method: "PATCH" },
    ),
};
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/api/client.ts
git commit -m "feat: api client wrappers for route update/delete"
```

---

## Task 6: Seed demo routes migration

**Context:** Replace the runtime `scenarios.ts` with real DB rows so the page loads from `api.listRoutes(DEMO_HUB_ID)`.

**Files:**
- Create: `supabase/migrations/20260421160000_seed_demo_routes.sql`
- Delete: `lib/config/scenarios.ts`

- [ ] **Step 1: Generate encoded polylines**

Run a one-off node snippet to produce the encoded polylines for the two demo routes (paste into a scratch REPL — do not commit this file):

```bash
node -e '
function encode(points){
  let last=[0,0],out="";
  for(const [lat,lng] of points){
    for(const [i,v] of [[0,Math.round(lat*1e5)],[1,Math.round(lng*1e5)]]){
      let d=v-last[i];last[i]=v;d=d<0?~(d<<1):d<<1;
      while(d>=0x20){out+=String.fromCharCode((0x20|(d&0x1f))+63);d>>=5;}
      out+=String.fromCharCode(d+63);
    }
  }
  return out;
}
console.log("r1:", encode([[35.0402,-106.609],[35.1963,-106.5332],[35.3082,-106.5486],[35.7544,-106.7003],[35.687,-105.9378]]));
console.log("r2:", encode([[35.0965,-106.6703],[35.0803,-106.6719],[35.0784,-106.6568],[34.9763,-106.7143]]));
'
```

Record the two output strings. Use them as `<<POLY_R1>>` and `<<POLY_R2>>` below.

- [ ] **Step 2: Write the seed migration**

`supabase/migrations/20260421160000_seed_demo_routes.sql` (replace `<<POLY_R1>>` and `<<POLY_R2>>` with the strings from Step 1):

```sql
-- Seed two demo routes for the demo hub so /routes loads real data.

INSERT INTO routes (
  id, hub_id, title, start_lat, start_lng, end_lat, end_lng,
  route_polyline, start_time, end_time, notes, published
) VALUES
(
  'r0000001-0000-0000-0000-000000000001',
  '1e53e9e8-11db-4012-9451-f996632cd250',
  'Albuquerque Northbound Farm Run',
  35.0402, -106.609,
  35.687, -105.9378,
  '<<POLY_R1>>',
  '2026-06-01T09:00:00Z',
  '2026-06-01T17:00:00Z',
  'Sample New Mexico route from Albuquerque to Santa Fe with common waypoint landmarks along I-25.',
  false
),
(
  'r0000002-0000-0000-0000-000000000002',
  '1e53e9e8-11db-4012-9451-f996632cd250',
  'South Valley Market Connector',
  35.0965, -106.6703,
  34.9763, -106.7143,
  '<<POLY_R2>>',
  '2026-06-02T10:00:00Z',
  '2026-06-02T14:00:00Z',
  'Short urban New Mexico sample route with two pickup points between origin and destination.',
  false
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO route_assignments (route_id, driver_id, status) VALUES
('r0000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000001', 'assigned'),
('r0000002-0000-0000-0000-000000000002', 'd0000001-0000-0000-0000-000000000001', 'assigned')
ON CONFLICT (route_id, driver_id) DO NOTHING;
```

- [ ] **Step 3: Apply the migration to the hosted DB**

Run: `npx supabase db push`
Expected: "Applied migration 20260421160000_seed_demo_routes".
If your flow requires running migration SQL manually via the dashboard, paste the file contents into the SQL editor and execute.

- [ ] **Step 4: Verify**

```bash
curl -s "http://localhost:3000/api/routes?hub_id=1e53e9e8-11db-4012-9451-f996632cd250" | jq 'length'
```
Expected: `2` (or higher if prior routes exist). Each returned row should include the stable ids `r0000001-...` and `r0000002-...`.

- [ ] **Step 5: Delete `lib/config/scenarios.ts`**

```bash
rm lib/config/scenarios.ts
```

(Import site in `app/routes/page.tsx` is replaced in Task 11.)

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260421160000_seed_demo_routes.sql
git rm lib/config/scenarios.ts
git commit -m "feat(db): seed demo routes; drop in-code scenarios"
```

---

## Task 7: `RouteList` component

**Files:**
- Create: `components/routes/route-list.tsx`

- [ ] **Step 1: Implement the component**

```tsx
"use client";
import type { RouteRow } from "@/lib/api/client";
import { routeColor } from "@/lib/routes/route-color";

type Props = {
  routes: RouteRow[];
  selectedId: string | null;
  mode: "view" | "create";
  onSelect: (id: string) => void;
  onCreateNew: () => void;
};

function formatShortTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" });
}

export function RouteList({ routes, selectedId, mode, onSelect, onCreateNew }: Props) {
  const sorted = [...routes].sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (
    <aside className="flex h-full w-[260px] flex-col border-r border-stone-200 bg-white">
      <button
        type="button"
        onClick={onCreateNew}
        className={`m-3 rounded-[1rem] border border-dashed px-3 py-2 text-sm font-semibold ${
          mode === "create"
            ? "border-amber-500 bg-amber-50 text-amber-900"
            : "border-stone-300 text-stone-700 hover:border-stone-400"
        }`}
      >
        + New route
      </button>
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 && (
          <p className="px-4 py-6 text-sm text-stone-500">No routes yet.</p>
        )}
        {sorted.map((route) => {
          const active = route.id === selectedId && mode === "view";
          return (
            <button
              type="button"
              key={route.id}
              onClick={() => onSelect(route.id)}
              className={`flex w-full items-start gap-3 border-b border-stone-100 px-4 py-3 text-left transition ${
                active ? "bg-stone-100" : "hover:bg-stone-50"
              }`}
            >
              <span
                aria-hidden
                className="mt-1 h-3 w-3 flex-shrink-0 rounded-full"
                style={{ backgroundColor: routeColor(route.id) }}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-900">{route.title}</span>
                <span className="mt-1 flex items-center gap-2 text-xs text-stone-600">
                  <span>{formatShortTime(route.start_time)}</span>
                  {route.published && (
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-800">
                      Published
                    </span>
                  )}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/routes/route-list.tsx
git commit -m "feat: RouteList component for multi-route planner"
```

---

## Task 8: `RouteMap` component

**Context:** Consult the existing `components/google-route-planner.tsx` for the `APIProvider`/`Map`/polyline decoding conventions; do not copy the form-editor portions.

**Files:**
- Create: `components/routes/route-map.tsx`

- [ ] **Step 1: Implement the component**

```tsx
"use client";
import { useEffect, useMemo, useRef } from "react";
import { APIProvider, Map, Marker, useMap } from "@vis.gl/react-google-maps";
import type { RouteRow } from "@/lib/api/client";
import { routeColor } from "@/lib/routes/route-color";

const MAP_ID = "fridge-to-farm-routes";

type Props = {
  routes: RouteRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

function decodePolyline(encoded: string): Array<{ lat: number; lng: number }> {
  const points: Array<{ lat: number; lng: number }> = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

function SelectedOverlay({ route }: { route: RouteRow }) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  const points = useMemo(() => {
    try { return decodePolyline(route.route_polyline); } catch { return []; }
  }, [route.route_polyline]);

  useEffect(() => {
    if (!map) return;
    polylineRef.current?.setMap(null);
    if (points.length > 1) {
      const poly = new google.maps.Polyline({
        path: points,
        strokeColor: routeColor(route.id),
        strokeWeight: 4,
        strokeOpacity: 0.9,
      });
      poly.setMap(map);
      polylineRef.current = poly;
    }
    const bounds = new google.maps.LatLngBounds();
    bounds.extend({ lat: route.start_lat, lng: route.start_lng });
    bounds.extend({ lat: route.end_lat, lng: route.end_lng });
    for (const p of points) bounds.extend(p);
    map.fitBounds(bounds, 80);
    return () => { polylineRef.current?.setMap(null); };
  }, [map, points, route.id, route.start_lat, route.start_lng, route.end_lat, route.end_lng]);

  return (
    <>
      <Marker position={{ lat: route.end_lat, lng: route.end_lng }} label="D" />
    </>
  );
}

function AllPinsFit({ routes, selectedId }: { routes: RouteRow[]; selectedId: string | null }) {
  const map = useMap();
  useEffect(() => {
    if (!map || selectedId) return;
    if (routes.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    for (const r of routes) bounds.extend({ lat: r.start_lat, lng: r.start_lng });
    map.fitBounds(bounds, 80);
  }, [map, routes, selectedId]);
  return null;
}

export function RouteMap({ routes, selectedId, onSelect }: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const selected = routes.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="h-full w-full">
      <APIProvider apiKey={apiKey}>
        <Map
          mapId={MAP_ID}
          defaultCenter={{ lat: 35.0844, lng: -106.6504 }}
          defaultZoom={8}
          gestureHandling="greedy"
          disableDefaultUI={false}
        >
          {routes.map((route) => (
            <Marker
              key={route.id}
              position={{ lat: route.start_lat, lng: route.start_lng }}
              onClick={() => onSelect(route.id)}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: routeColor(route.id),
                fillOpacity: route.id === selectedId ? 1 : 0.85,
                strokeColor: "#ffffff",
                strokeWeight: 2,
                scale: route.id === selectedId ? 11 : 8,
              }}
            />
          ))}
          {selected && <SelectedOverlay route={selected} />}
          <AllPinsFit routes={routes} selectedId={selectedId} />
        </Map>
      </APIProvider>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. If `google` global is missing, consult existing `components/google-route-planner.tsx` — project already depends on `@types/google.maps` and the existing planner imports `google` as ambient.

- [ ] **Step 3: Commit**

```bash
git add components/routes/route-map.tsx
git commit -m "feat: RouteMap with all-pins + selected-polyline rendering"
```

---

## Task 9: `RouteEditor` component

**Context:** The detail panel. Two modes: `view` (existing route, save disabled until `isDirty`, has Delete button) and `create` (blank form, save always enabled, no Delete). Surface `rebroadcast` result after save when present.

**Files:**
- Create: `components/routes/route-editor.tsx`

- [ ] **Step 1: Implement the component**

```tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import type { RouteRow, RouteUpdatePayload, RebroadcastResult } from "@/lib/api/client";
import type { DriverSummary } from "@/lib/api/client";

export type EditorSubmit =
  | { mode: "update"; id: string; payload: RouteUpdatePayload }
  | { mode: "create"; payload: Record<string, unknown> };

type Props = {
  mode: "empty" | "view" | "create";
  route?: RouteRow;
  drivers: DriverSummary[];
  onSubmit: (payload: EditorSubmit) => void;
  onDelete?: (id: string) => void;
  onCancel: () => void;
  busy: boolean;
  lastRebroadcast?: RebroadcastResult | null;
  errorMessage?: string | null;
};

type FormState = {
  title: string;
  driver_id: string;
  start_time: string;
  end_time: string;
  start_lat: string;
  start_lng: string;
  end_lat: string;
  end_lng: string;
  notes: string;
};

function toLocalInput(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

function fromLocalInput(v: string): string {
  if (!v) return "";
  return new Date(v).toISOString();
}

function emptyState(): FormState {
  return { title: "", driver_id: "", start_time: "", end_time: "",
           start_lat: "", start_lng: "", end_lat: "", end_lng: "", notes: "" };
}

function stateFromRoute(r: RouteRow, driverId: string): FormState {
  return {
    title: r.title,
    driver_id: driverId,
    start_time: toLocalInput(r.start_time),
    end_time: toLocalInput(r.end_time),
    start_lat: String(r.start_lat),
    start_lng: String(r.start_lng),
    end_lat: String(r.end_lat),
    end_lng: String(r.end_lng),
    notes: r.notes ?? "",
  };
}

export function RouteEditor(props: Props) {
  const { mode, route, drivers, onSubmit, onDelete, onCancel, busy, lastRebroadcast, errorMessage } = props;

  const initial = useMemo(() => {
    if (mode === "view" && route) return stateFromRoute(route, "");
    return emptyState();
  }, [mode, route]);

  const [form, setForm] = useState<FormState>(initial);

  useEffect(() => {
    setForm(initial);
  }, [initial]);

  const isDirty = useMemo(() => {
    if (mode === "create") return true;
    return JSON.stringify(form) !== JSON.stringify(initial);
  }, [form, initial, mode]);

  if (mode === "empty") {
    return (
      <aside className="flex h-full w-[380px] items-center justify-center border-l border-stone-200 bg-white p-6 text-sm text-stone-500">
        Select a route or create a new one.
      </aside>
    );
  }

  const submit = () => {
    if (mode === "create") {
      onSubmit({
        mode: "create",
        payload: {
          title: form.title,
          driver_id: form.driver_id,
          start_lat: Number(form.start_lat),
          start_lng: Number(form.start_lng),
          end_lat: Number(form.end_lat),
          end_lng: Number(form.end_lng),
          start_time: fromLocalInput(form.start_time),
          end_time: fromLocalInput(form.end_time),
          notes: form.notes || null,
          route_polyline: "placeholder",
        },
      });
      return;
    }
    if (!route) return;
    const payload: RouteUpdatePayload = {
      title: form.title,
      start_lat: Number(form.start_lat),
      start_lng: Number(form.start_lng),
      end_lat: Number(form.end_lat),
      end_lng: Number(form.end_lng),
      start_time: fromLocalInput(form.start_time),
      end_time: fromLocalInput(form.end_time),
      notes: form.notes || null,
    };
    if (form.driver_id) payload.driver_id = form.driver_id;
    onSubmit({ mode: "update", id: route.id, payload });
  };

  const set = <K extends keyof FormState>(k: K) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((s) => ({ ...s, [k]: e.target.value }));

  return (
    <aside className="flex h-full w-[380px] flex-col overflow-y-auto border-l border-stone-200 bg-white p-5">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">
          {mode === "create" ? "New route" : "Edit route"}
        </h2>
        {mode === "view" && route?.published && (
          <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold uppercase text-emerald-800">
            Published
          </span>
        )}
      </header>

      <label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-stone-600">
        Title
        <input className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-sm"
               value={form.title} onChange={set("title")} />
      </label>

      <label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-stone-600">
        Driver
        <select className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-sm"
                value={form.driver_id} onChange={set("driver_id")}>
          <option value="">— unassigned —</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>
          ))}
        </select>
      </label>

      <div className="mb-3 grid grid-cols-2 gap-3">
        <label className="text-xs font-semibold uppercase tracking-wide text-stone-600">
          Start
          <input type="datetime-local"
                 className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-sm"
                 value={form.start_time} onChange={set("start_time")} />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-stone-600">
          End
          <input type="datetime-local"
                 className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-sm"
                 value={form.end_time} onChange={set("end_time")} />
        </label>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-3">
        <label className="text-xs font-semibold uppercase tracking-wide text-stone-600">
          Start lat
          <input className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-sm"
                 value={form.start_lat} onChange={set("start_lat")} />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-stone-600">
          Start lng
          <input className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-sm"
                 value={form.start_lng} onChange={set("start_lng")} />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-stone-600">
          End lat
          <input className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-sm"
                 value={form.end_lat} onChange={set("end_lat")} />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-stone-600">
          End lng
          <input className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-sm"
                 value={form.end_lng} onChange={set("end_lng")} />
        </label>
      </div>

      <label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-stone-600">
        Notes
        <textarea rows={3}
                  className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-sm"
                  value={form.notes} onChange={set("notes")} />
      </label>

      {errorMessage && (
        <p className="mb-3 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-800">{errorMessage}</p>
      )}

      {lastRebroadcast && (
        <p className="mb-3 rounded border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-800">
          Re-broadcast: {lastRebroadcast.farmers_notified} farmer(s) notified.
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pt-3">
        <button type="button" onClick={onCancel}
                className="rounded border border-stone-300 px-3 py-2 text-sm text-stone-700">
          Cancel
        </button>
        <div className="flex gap-2">
          {mode === "view" && route && onDelete && (
            <button type="button"
                    disabled={busy}
                    onClick={() => { if (confirm("Delete this route?")) onDelete(route.id); }}
                    className="rounded border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">
              Delete
            </button>
          )}
          <button type="button"
                  disabled={busy || !isDirty}
                  onClick={submit}
                  className="rounded bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/routes/route-editor.tsx
git commit -m "feat: RouteEditor detail panel with view/create modes"
```

---

## Task 10: `RoutePlannerShell` — integrates list/map/editor

**Files:**
- Create: `components/routes/route-planner-shell.tsx`

- [ ] **Step 1: Implement the shell**

```tsx
"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type RebroadcastResult } from "@/lib/api/client";
import { RouteList } from "./route-list";
import { RouteMap } from "./route-map";
import { RouteEditor, type EditorSubmit } from "./route-editor";

type Props = { hubId: string };

export function RoutePlannerShell({ hubId }: Props) {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "create">("view");
  const [rebroadcast, setRebroadcast] = useState<RebroadcastResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const routesQ = useQuery({ queryKey: ["routes", hubId], queryFn: () => api.listRoutes(hubId) });
  const driversQ = useQuery({ queryKey: ["drivers", hubId], queryFn: () => api.listDrivers(hubId) });

  const selected = routesQ.data?.find((r) => r.id === selectedId) ?? null;
  const editorMode: "empty" | "view" | "create" =
    mode === "create" ? "create" : selected ? "view" : "empty";

  const invalidate = () => qc.invalidateQueries({ queryKey: ["routes", hubId] });

  const updateMut = useMutation({
    mutationFn: (input: { id: string; payload: Parameters<typeof api.updateRoute>[1] }) =>
      api.updateRoute(input.id, input.payload),
    onSuccess: (res) => {
      setRebroadcast(res.rebroadcast ?? null);
      setErrorMsg(null);
      invalidate();
    },
    onError: (e: unknown) => setErrorMsg(e instanceof Error ? e.message : "Update failed"),
  });

  const createMut = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const created = await api.createRoute({ ...payload, hub_id: hubId });
      await api.publishRoute(created.id);
      return created;
    },
    onSuccess: async (created) => {
      setErrorMsg(null);
      await invalidate();
      setMode("view");
      setSelectedId(created.id);
    },
    onError: (e: unknown) => setErrorMsg(e instanceof Error ? e.message : "Create failed"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.deleteRoute(id),
    onSuccess: () => {
      setSelectedId(null);
      setRebroadcast(null);
      setErrorMsg(null);
      invalidate();
    },
    onError: (e: unknown) => setErrorMsg(e instanceof Error ? e.message : "Delete failed"),
  });

  const handleSelect = (id: string) => {
    setMode("view");
    setSelectedId(id);
    setRebroadcast(null);
    setErrorMsg(null);
  };

  const handleCreateNew = () => {
    setMode("create");
    setSelectedId(null);
    setRebroadcast(null);
    setErrorMsg(null);
  };

  const handleSubmit = (submit: EditorSubmit) => {
    setRebroadcast(null);
    if (submit.mode === "update") {
      updateMut.mutate({ id: submit.id, payload: submit.payload });
    } else {
      createMut.mutate(submit.payload);
    }
  };

  const handleCancel = () => {
    setMode("view");
    if (selectedId == null) {
      // leaving create mode with nothing selected → empty
    }
    setErrorMsg(null);
    setRebroadcast(null);
  };

  if (routesQ.isLoading || driversQ.isLoading) {
    return <div className="flex h-full items-center justify-center text-sm text-stone-600">Loading…</div>;
  }
  if (routesQ.isError || driversQ.isError) {
    return (
      <button type="button"
              onClick={() => { routesQ.refetch(); driversQ.refetch(); }}
              className="m-6 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        Failed to load. Tap to retry.
      </button>
    );
  }

  return (
    <div className="flex h-full overflow-hidden rounded-[1.5rem] border border-stone-200 bg-white">
      <RouteList
        routes={routesQ.data ?? []}
        selectedId={selectedId}
        mode={mode}
        onSelect={handleSelect}
        onCreateNew={handleCreateNew}
      />
      <div className="min-w-0 flex-1">
        <RouteMap
          routes={routesQ.data ?? []}
          selectedId={selectedId}
          onSelect={handleSelect}
        />
      </div>
      <RouteEditor
        mode={editorMode}
        route={selected ?? undefined}
        drivers={driversQ.data ?? []}
        onSubmit={handleSubmit}
        onDelete={(id) => deleteMut.mutate(id)}
        onCancel={handleCancel}
        busy={updateMut.isPending || createMut.isPending || deleteMut.isPending}
        lastRebroadcast={rebroadcast}
        errorMessage={errorMsg}
      />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/routes/route-planner-shell.tsx
git commit -m "feat: RoutePlannerShell wiring list/map/editor with mutations"
```

---

## Task 11: Mount shell on `/routes` and delete old planner

**Files:**
- Modify: `app/routes/page.tsx`
- Delete: `components/google-route-planner.tsx`

- [ ] **Step 1: Rewrite the page**

`app/routes/page.tsx`:

```tsx
"use client";
import { Navbar } from "@/components/navbar";
import { RoutePlannerShell } from "@/components/routes/route-planner-shell";
import { DEMO_HUB_ID } from "@/lib/config/demo";

export default function RoutePlanningPage() {
  return (
    <div className="h-screen overflow-hidden bg-[linear-gradient(180deg,#eef3f1_0%,#f5f7f6_100%)]">
      <Navbar />
      <main className="mx-auto flex h-[calc(100vh-76px)] max-w-7xl flex-col overflow-hidden px-4 py-4 sm:px-6 lg:px-8">
        <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
          <div className="min-h-0 flex-1 overflow-hidden">
            <RoutePlannerShell hubId={DEMO_HUB_ID} />
          </div>
        </section>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Delete the old planner**

```bash
git rm components/google-route-planner.tsx
```

- [ ] **Step 3: Typecheck + full test run**

Run: `npx tsc --noEmit && npx vitest run`
Expected: all green. If `tsc` reports missing imports from deleted modules (e.g. `routeScenarios`), grep the repo and remove the orphan references (none expected after Task 6 removed `scenarios.ts`).

- [ ] **Step 4: Manual UI smoke**

Run: `npm run dev`
Then in a browser at `http://localhost:3000/routes`, verify:
1. List shows 2 seeded routes; both pins visible on map.
2. Click a list item → map fits to its bounds, polyline + markers draw, editor populates.
3. Change title → Save → list row updates, no rebroadcast shown (route is unpublished).
4. Manually mark one route `published=true` in Supabase, reload, edit title, Save → rebroadcast result appears in panel (uses dry-run Twilio mock in dev only if `TWILIO_MOCK=1`; otherwise real Twilio).
5. Click `+ New route` → editor shows blank form, map deselects, save disabled? No — save is always enabled in create mode; fill fields, Save → new row appears in list and becomes selected.
6. Select a route → Delete → confirm → route disappears from list and map.

- [ ] **Step 5: Commit**

```bash
git add app/routes/page.tsx
git commit -m "feat: mount multi-route planner on /routes; remove legacy planner"
```

---

## Self-review notes

- **Spec coverage:** All spec sections map to tasks. User flow (steps 1–7) → Tasks 7/8/9/10/11. Layout three-column → Task 10. Detail panel states → Task 9. Map behavior → Task 8. PATCH endpoint → Task 3. DELETE endpoint → Task 4. Data flow (useQuery + three mutations) → Task 10. Component decomposition → Tasks 7–11. Seed migration → Task 6. Testing (integration patch/delete) → Tasks 3/4. Deletion of scenarios.ts + scenarios prop → Task 6/11.
- **Prereq gap fixed:** Spec assumed a `publishRoute` service existed; Task 1 extracts it before Task 3 needs it.
- **Type consistency:** `RouteRow`, `RouteUpdatePayload`, `RebroadcastResult`, `EditorSubmit`, `FormState`, `PublishRouteResult` names consistent across tasks.
- **Known caveat:** Task 9's create flow submits `route_polyline: "placeholder"` since geocoding/directions integration is not in scope per spec — the map will still render start/end markers correctly; the polyline just won't draw until the route is edited with a real encoded polyline. This matches the spec's non-goal scope.
