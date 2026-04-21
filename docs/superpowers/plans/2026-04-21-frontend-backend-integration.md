# Frontend ↔ Backend Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every `mock-data` import in role pages with real Supabase-backed data, add the three missing data sources (drivers, hub stats, farmer opportunities), fix the dead publish flow in the route planner, and ship the full farmer-notification loop end-to-end.

**Architecture:** Client-rendered role pages (`"use client"`) reading identity from `useSearchParams()` and fetching via TanStack Query against new REST endpoints under `app/api/*`. One new Supabase migration adds `drivers`, `route_assignments`, a `find_routes_near_farmer` Postgres function, and seed rows. Integration tests live alongside each new endpoint and hit the route handlers directly (same pattern as `tests/api/routes/create.test.ts`).

**Tech Stack:** Next.js 16 App Router, Supabase (Postgres) via `createAdminSupabaseClient`, TanStack Query (`@tanstack/react-query` — new dep), Vitest integration tests, Twilio SMS (already wired).

**Spec:** `docs/superpowers/specs/2026-04-21-frontend-backend-integration-design.md`

---

## File Map

**Created**

- `supabase/migrations/20260421120000_add_drivers_and_assignments.sql` — new tables, function, seed.
- `app/api/hubs/route.ts` — `GET` list hubs.
- `app/api/hubs/[id]/stats/route.ts` — `GET` hub dashboard counts.
- `app/api/drivers/route.ts` — `GET` drivers, optional `?hub_id=`.
- `app/api/drivers/[id]/assignments/route.ts` — `GET` assignments for driver.
- `app/api/drivers/[id]/assignments/[assignmentId]/route.ts` — `PATCH` assignment status.
- `app/api/farmers/[id]/opportunities/route.ts` — `GET` unresponded nearby routes.
- `app/api/farmers/[id]/notifications/route.ts` — `GET` notification_log rows as messages.
- `lib/api/client.ts` — typed fetch wrappers (one function per endpoint).
- `lib/config/scenarios.ts` — moved `routeScenarios` (UI presets, not mock).
- `lib/config/landing.ts` — moved `heroStats` (marketing copy).
- `app/providers.tsx` — `QueryClientProvider` wrapper.
- `tests/api/hubs/list.test.ts`
- `tests/api/hubs/[id]/stats.test.ts`
- `tests/api/drivers/list.test.ts`
- `tests/api/drivers/[id]/assignments/list.test.ts`
- `tests/api/drivers/[id]/assignments/[assignmentId]/patch.test.ts`
- `tests/api/farmers/[id]/opportunities.test.ts`
- `tests/api/farmers/[id]/notifications.test.ts`
- `tests/api/routes/publish-flow.test.ts` — regression: POST → PATCH publish writes notification_log.

**Modified**

- `app/api/routes/route.ts` — `POST` now requires `driver_id`, inserts `route_assignments` row, stops stuffing driver info into `notes`.
- `app/layout.tsx` — wrap children in `<Providers>`.
- `app/farmer/page.tsx` — rewrite as client component with React Query.
- `app/driver/page.tsx` — rewrite as client component wrapper reading `?id=`.
- `app/hub/page.tsx` — rewrite as client component reading `?id=`.
- `app/routes/page.tsx` — remove mock imports, pass hub id from search params, no more `drivers={drivers}` mock prop.
- `app/page.tsx` — swap `heroStats` import to `lib/config/landing`, drop `routePlans` / `pickupOpportunities` / `farmerNotifications` / `hubOperationalStats` usage for marketing-safe static content.
- `components/google-route-planner.tsx` — drop hardcoded `DEMO_HUB_ID`; accept `hubId` prop; load drivers via React Query; two-step publish mutation (POST then PATCH `/publish`); surface notify result.
- `components/hub-dashboard-shell.tsx` — accept `stats` and `routes` props; drop mock imports; derive selected route from props.
- `components/driver-dashboard.tsx` — accept single `driver` + `assignments` from props; `updateStatus` calls `PATCH` mutation (props passed in by page).
- `lib/types.ts` — align `DriverRouteStatus` casing with DB CHECK values (see Task 2) OR keep UI labels and translate at the boundary (plan uses translation in the API-client layer).
- `package.json` — add `@tanstack/react-query`.

**Deleted**

- `app/api/routes/publish-new/` (empty dir).
- `app/api/notify-demo/` (empty dir).
- `lib/mock-data.ts` (after all imports removed).

---

## Conventions

- **Error envelope:** all new endpoints return `{ error: string }` on failure with appropriate status. Matches `app/api/routes/route.ts`.
- **Validation:** reuse helpers from `lib/api/validation.ts`.
- **Supabase client:** `createAdminSupabaseClient()` from `@/lib/supabase/server`.
- **DB status values:** `route_assignments.status` uses snake_case strings (`assigned`, `started`, `in_progress`, `completed`, `cancelled`). UI type `DriverRouteStatus` uses title case (`Waiting`, `Started`, `In Progress`, `Completed`). Translation happens in `lib/api/client.ts`:
  - `assigned` ↔ `Waiting`
  - `started` ↔ `Started`
  - `in_progress` ↔ `In Progress`
  - `completed` ↔ `Completed`
  - `cancelled` → `Waiting` on read (UI has no cancelled state); UI cannot send `cancelled`.
- **Test IDs:** each test file uses `itest-<feature>-${Date.now()}` as its tag suffix and cleans up in `afterAll`, mirroring `tests/api/routes/create.test.ts`.
- **Commits:** one logical commit per task, message format `feat(scope): short summary` or `test:` / `refactor:` / `chore:` as appropriate.

---

## Task 1: Add `@tanstack/react-query` dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install react-query**

Run:
```bash
npm install @tanstack/react-query@^5
```

- [ ] **Step 2: Verify build still succeeds**

Run: `npm run build`
Expected: build completes with no new errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @tanstack/react-query dependency"
```

---

## Task 2: Write migration file (tables + function + seed)

**Files:**
- Create: `supabase/migrations/20260421120000_add_drivers_and_assignments.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Migration: drivers, route_assignments, find_routes_near_farmer
-- Created: 2026-04-21

-- =============================================================================
-- Drivers
-- =============================================================================
CREATE TABLE IF NOT EXISTS drivers (
  id         uuid        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  hub_id     uuid        NOT NULL REFERENCES hubs(id) ON DELETE RESTRICT,
  first_name text        NOT NULL,
  last_name  text        NOT NULL,
  phone      text        NOT NULL UNIQUE,
  vehicle    text,
  zone       text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_drivers_hub_id ON drivers (hub_id);

-- =============================================================================
-- Route Assignments (join table: drivers <-> routes)
-- =============================================================================
CREATE TABLE IF NOT EXISTS route_assignments (
  id         uuid        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  route_id   uuid        NOT NULL REFERENCES routes(id)  ON DELETE CASCADE,
  driver_id  uuid        NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
  status     text        NOT NULL DEFAULT 'assigned'
             CHECK (status IN ('assigned','started','in_progress','completed','cancelled')),
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (route_id, driver_id)
);
CREATE INDEX IF NOT EXISTS idx_route_assignments_driver_id ON route_assignments (driver_id);
CREATE INDEX IF NOT EXISTS idx_route_assignments_route_id  ON route_assignments (route_id);

-- =============================================================================
-- Find published routes near a farmer, excluding already-responded routes
-- =============================================================================
CREATE OR REPLACE FUNCTION find_routes_near_farmer(
  farmer_id_in uuid,
  radius_miles float8 DEFAULT 10
) RETURNS TABLE (
  route_id           uuid,
  route_title        text,
  hub_id             uuid,
  hub_name           text,
  start_time         timestamptz,
  end_time           timestamptz,
  start_lat          float8,
  start_lng          float8,
  end_lat            float8,
  end_lng            float8,
  notes              text,
  min_distance_miles float8
)
LANGUAGE plpgsql
AS $$
DECLARE
  f_lat float8;
  f_lng float8;
BEGIN
  SELECT latitude, longitude INTO f_lat, f_lng FROM farmers WHERE id = farmer_id_in;
  IF f_lat IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.title,
    h.id,
    h.name,
    r.start_time,
    r.end_time,
    r.start_lat,
    r.start_lng,
    r.end_lat,
    r.end_lng,
    r.notes,
    LEAST(
      haversine_miles(f_lat, f_lng, r.start_lat, r.start_lng),
      haversine_miles(f_lat, f_lng, r.end_lat,   r.end_lng)
    ) AS min_distance_miles
  FROM routes r
  JOIN hubs   h ON h.id = r.hub_id
  WHERE r.published = true
    AND NOT EXISTS (
      SELECT 1 FROM route_responses rr
      WHERE rr.route_id = r.id AND rr.farmer_id = farmer_id_in
    )
    AND LEAST(
      haversine_miles(f_lat, f_lng, r.start_lat, r.start_lng),
      haversine_miles(f_lat, f_lng, r.end_lat,   r.end_lng)
    ) <= radius_miles
  ORDER BY min_distance_miles ASC;
END;
$$;

-- =============================================================================
-- Seed: one hub + two drivers
-- =============================================================================
INSERT INTO hubs (id, name, phone, email)
VALUES ('1e53e9e8-11db-4012-9451-f996632cd250',
        'Boise Distribution Hub',
        '+15052267853',
        'ops@boisedistro.example.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO drivers (id, hub_id, first_name, last_name, phone, vehicle, zone, avatar_url)
VALUES
  ('d0000001-0000-0000-0000-000000000001',
   '1e53e9e8-11db-4012-9451-f996632cd250',
   'Elena', 'Martinez', '+15055550142',
   'Box Truck 12', 'Boise North',
   'https://i.pravatar.cc/120?img=32'),
  ('d0000002-0000-0000-0000-000000000002',
   '1e53e9e8-11db-4012-9451-f996632cd250',
   'Marcus', 'Hill', '+15055550160',
   'Flatbed 7', 'Boise South',
   'https://i.pravatar.cc/120?img=12')
ON CONFLICT (id) DO NOTHING;
```

**Note:** the seed hub UUID matches the existing hardcoded `DEMO_HUB_ID` so local dev keeps working across the transition.

- [ ] **Step 2: Apply the migration to local Supabase**

Run: `npx supabase db push` (or the project's equivalent — if uncertain, ask the user and document the command actually used).
Expected: migration applied, no errors. Verify with:
```bash
npx supabase db diff
```
Expected: no drift.

- [ ] **Step 3: Regenerate `lib/supabase/database.types.ts`**

Run:
```bash
npx supabase gen types typescript --local > lib/supabase/database.types.ts
```
Expected: file now contains `drivers` and `route_assignments` tables plus the new function.

- [ ] **Step 4: Verify `npm run build` still passes**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260421120000_add_drivers_and_assignments.sql lib/supabase/database.types.ts
git commit -m "feat(db): add drivers, route_assignments, find_routes_near_farmer"
```

---

## Task 3: `GET /api/hubs` endpoint + test

**Files:**
- Create: `app/api/hubs/route.ts`
- Create: `tests/api/hubs/list.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/api/hubs/list.test.ts
import { config } from "dotenv";
import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/hubs/route";

config({ path: ".env.local" });

describe("GET /api/hubs — integration", () => {
  it("returns seeded hub with id, name, phone, email", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = (await res.json()) as Array<{ id: string; name: string; phone: string; email: string }>;
    expect(Array.isArray(json)).toBe(true);
    const seeded = json.find((h) => h.id === "1e53e9e8-11db-4012-9451-f996632cd250");
    expect(seeded).toBeDefined();
    expect(seeded!.name).toBe("Boise Distribution Hub");
    expect(seeded!.phone).toBe("+15052267853");
    expect(seeded!.email).toContain("@");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/api/hubs/list.test.ts`
Expected: FAIL — module `@/app/api/hubs/route` does not exist.

- [ ] **Step 3: Implement the endpoint**

```ts
// app/api/hubs/route.ts
import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("hubs")
    .select("id, name, phone, email")
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/api/hubs/list.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/hubs/route.ts tests/api/hubs/list.test.ts
git commit -m "feat(api): GET /api/hubs returns hub list"
```

---

## Task 4: `GET /api/drivers` endpoint + test

**Files:**
- Create: `app/api/drivers/route.ts`
- Create: `tests/api/drivers/list.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/api/drivers/list.test.ts
import { config } from "dotenv";
import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/drivers/route";

config({ path: ".env.local" });

const HUB_ID = "1e53e9e8-11db-4012-9451-f996632cd250";

function req(url: string) {
  return new Request(url);
}

describe("GET /api/drivers — integration", () => {
  it("returns all drivers when hub_id is absent", async () => {
    const res = await GET(req("http://localhost/api/drivers"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json)).toBe(true);
    expect(json.length).toBeGreaterThanOrEqual(2);
  });

  it("filters by hub_id", async () => {
    const res = await GET(req(`http://localhost/api/drivers?hub_id=${HUB_ID}`));
    expect(res.status).toBe(200);
    const json = (await res.json()) as Array<{ hubId: string; firstName: string }>;
    expect(json.every((d) => d.hubId === HUB_ID)).toBe(true);
    expect(json.find((d) => d.firstName === "Elena")).toBeDefined();
  });

  it("rejects invalid hub_id with 400", async () => {
    const res = await GET(req("http://localhost/api/drivers?hub_id=not-a-uuid"));
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/api/drivers/list.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement the endpoint**

```ts
// app/api/drivers/route.ts
import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hubId = searchParams.get("hub_id")?.trim();

  if (hubId && !UUID_RE.test(hubId)) {
    return NextResponse.json({ error: "hub_id must be a UUID." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  let query = supabase
    .from("drivers")
    .select("id, hub_id, first_name, last_name, phone, vehicle, zone, avatar_url")
    .order("first_name", { ascending: true });
  if (hubId) query = query.eq("hub_id", hubId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const shaped = (data ?? []).map((d) => ({
    id: d.id,
    hubId: d.hub_id,
    firstName: d.first_name,
    lastName: d.last_name,
    phone: d.phone,
    vehicle: d.vehicle,
    zone: d.zone,
    avatarUrl: d.avatar_url,
  }));
  return NextResponse.json(shaped);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/api/drivers/list.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/drivers/route.ts tests/api/drivers/list.test.ts
git commit -m "feat(api): GET /api/drivers with optional hub_id filter"
```

---

## Task 5: Modify `POST /api/routes` to require `driver_id` + create assignment row

**Files:**
- Modify: `app/api/routes/route.ts`
- Modify: `tests/api/routes/create.test.ts`

- [ ] **Step 1: Update the existing test to pass a `driver_id` and assert assignment created**

Edit `tests/api/routes/create.test.ts`:

Inside the test file's setup (near `createdRouteIds`), add:
```ts
const SEED_DRIVER_ID = "d0000001-0000-0000-0000-000000000001";
```

In the first `it(...)` test, add `driver_id: SEED_DRIVER_ID` to the `callPost` body. After asserting `json.id`, add:

```ts
const { data: assignment } = await supabase
  .from("route_assignments")
  .select("id, route_id, driver_id, status")
  .eq("route_id", json.id)
  .single();
expect(assignment).not.toBeNull();
expect(assignment!.driver_id).toBe(SEED_DRIVER_ID);
expect(assignment!.status).toBe("assigned");
```

In `afterAll`, add (before the routes delete):
```ts
await supabase.from("route_assignments").delete().in("route_id", createdRouteIds.length ? createdRouteIds : ["__none__"]);
```

Add a new test at the end:
```ts
it("rejects missing driver_id with 400", async () => {
  const response = await callPost({
    hub_id: hub.id,
    title: `No Driver ${TEST_TAG}`,
    route_polyline: "x",
    start_lat: 35, start_lng: -106,
    end_lat: 35.1, end_lng: -106.1,
    start_time: "2026-06-01T09:00:00Z",
    end_time: "2026-06-01T17:00:00Z",
  });
  expect(response.status).toBe(400);
});
```

- [ ] **Step 2: Run the test — verify it fails**

Run: `npx vitest run tests/api/routes/create.test.ts`
Expected: FAIL — endpoint doesn't require `driver_id` yet and no assignment row is inserted.

- [ ] **Step 3: Update `app/api/routes/route.ts`**

At the top of the file, alongside the other `asString` destructures in `POST`, add `const driverId = asString(body.driver_id);`

Update the required-field check:
```ts
if (!hubId || !driverId || !title || !routePolyline || !startTime || !endTime) {
  return NextResponse.json(
    { error: "hub_id, driver_id, title, route_polyline, start_time, and end_time are required." },
    { status: 400 },
  );
}
```

After the successful route insert (`.single()` block, before the SMS try/catch), add:
```ts
const { error: assignmentError } = await supabase
  .from("route_assignments")
  .insert({ route_id: data.id, driver_id: driverId, status: "assigned" });
if (assignmentError) {
  console.error("[routes.POST] assignment insert failed:", assignmentError);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/api/routes/create.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/routes/route.ts tests/api/routes/create.test.ts
git commit -m "feat(api): POST /api/routes requires driver_id and creates assignment"
```

---

## Task 6: `GET /api/drivers/[id]/assignments` + test

**Files:**
- Create: `app/api/drivers/[id]/assignments/route.ts`
- Create: `tests/api/drivers/[id]/assignments/list.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/api/drivers/[id]/assignments/list.test.ts
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
    expect(seeded[0].pickupWindow).toContain(":");  // rendered window string
    expect(seeded.map((a) => a.status).sort()).toEqual(["Started", "Waiting"]);
  });

  it("400 on invalid driver id", async () => {
    const res = await GET(new Request("http://localhost/api/drivers/nope/assignments"), {
      params: Promise.resolve({ id: "nope" }),
    });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/api/drivers/[id]/assignments/list.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement the endpoint**

```ts
// app/api/drivers/[id]/assignments/route.ts
import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RouteContext = { params: Promise<{ id: string }> };

const DB_TO_UI: Record<string, string> = {
  assigned: "Waiting",
  started: "Started",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Waiting",
};

function formatWindow(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const date = s.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const sTime = s.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const eTime = e.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${date} · ${sTime} - ${eTime}`;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json({ error: "Driver id must be a UUID." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("route_assignments")
    .select(`
      id, status, notes,
      routes ( id, title, start_time, end_time, start_lat, start_lng, end_lat, end_lng, notes )
    `)
    .eq("driver_id", id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const shaped = (data ?? []).map((row) => {
    const r = row.routes as {
      id: string; title: string; start_time: string; end_time: string;
      start_lat: number; start_lng: number; end_lat: number; end_lng: number; notes: string | null;
    };
    return {
      id: row.id,
      routeId: r.id,
      routeTitle: r.title,
      pickupSource: `${r.start_lat.toFixed(4)}, ${r.start_lng.toFixed(4)}`,
      destination: `${r.end_lat.toFixed(4)}, ${r.end_lng.toFixed(4)}`,
      pickupWindow: formatWindow(r.start_time, r.end_time),
      material: r.notes ?? "See route notes",
      notes: row.notes ?? "",
      status: DB_TO_UI[row.status] ?? "Waiting",
    };
  });

  return NextResponse.json(shaped);
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run tests/api/drivers/[id]/assignments/list.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/drivers/[id]/assignments/route.ts tests/api/drivers/[id]/assignments/list.test.ts
git commit -m "feat(api): GET driver assignments shaped for UI"
```

---

## Task 7: `PATCH /api/drivers/[id]/assignments/[assignmentId]` + test

**Files:**
- Create: `app/api/drivers/[id]/assignments/[assignmentId]/route.ts`
- Create: `tests/api/drivers/[id]/assignments/[assignmentId]/patch.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run "tests/api/drivers/[id]/assignments/[assignmentId]/patch.test.ts"`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement the endpoint**

```ts
// app/api/drivers/[id]/assignments/[assignmentId]/route.ts
import { NextResponse } from "next/server";
import { asString, isRecord } from "@/lib/api/validation";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const UI_TO_DB: Record<string, string> = {
  Waiting: "assigned",
  Started: "started",
  "In Progress": "in_progress",
  Completed: "completed",
};
const DB_TO_UI: Record<string, string> = {
  assigned: "Waiting",
  started: "Started",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Waiting",
};

type Ctx = { params: Promise<{ id: string; assignmentId: string }> };

export async function PATCH(request: Request, context: Ctx) {
  const { id, assignmentId } = await context.params;
  if (!UUID_RE.test(id) || !UUID_RE.test(assignmentId)) {
    return NextResponse.json({ error: "id and assignmentId must be UUIDs." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  if (!isRecord(body)) {
    return NextResponse.json({ error: "Body must be a JSON object." }, { status: 400 });
  }
  const uiStatus = asString(body.status);
  const dbStatus = UI_TO_DB[uiStatus];
  if (!dbStatus) {
    return NextResponse.json(
      { error: `status must be one of: ${Object.keys(UI_TO_DB).join(", ")}.` },
      { status: 400 },
    );
  }

  const supabase = createAdminSupabaseClient();
  const { data: existing, error: exErr } = await supabase
    .from("route_assignments")
    .select("id, driver_id")
    .eq("id", assignmentId)
    .maybeSingle();
  if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 });
  if (!existing || existing.driver_id !== id) {
    return NextResponse.json({ error: "Assignment not found for this driver." }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("route_assignments")
    .update({ status: dbStatus, updated_at: new Date().toISOString() })
    .eq("id", assignmentId)
    .select("id, status")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id: data.id, status: DB_TO_UI[data.status] });
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run "tests/api/drivers/[id]/assignments/[assignmentId]/patch.test.ts"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/drivers/[id]/assignments/[assignmentId]/route.ts "tests/api/drivers/[id]/assignments/[assignmentId]/patch.test.ts"
git commit -m "feat(api): PATCH driver assignment status"
```

---

## Task 8: `GET /api/hubs/[id]/stats` + test

**Files:**
- Create: `app/api/hubs/[id]/stats/route.ts`
- Create: `tests/api/hubs/[id]/stats.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/api/hubs/[id]/stats.test.ts
import { config } from "dotenv";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { GET } from "@/app/api/hubs/[id]/stats/route";
import type { Database } from "@/lib/supabase/database.types";

config({ path: ".env.local" });

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const HUB_ID = "1e53e9e8-11db-4012-9451-f996632cd250";
const DRIVER_ID = "d0000001-0000-0000-0000-000000000001";
const TAG = `itest-stats-${Date.now()}`;
let routeId = "";
let farmerId = "";
let assignmentId = "";
let responseId = "";

beforeAll(async () => {
  // clear any farmer squatting on the test phone
  const { data: prior } = await supabase.from("farmers").select("id").eq("phone", "+15052267999");
  const priorIds = (prior ?? []).map((f) => f.id);
  if (priorIds.length) {
    await supabase.from("route_responses").delete().in("farmer_id", priorIds);
    await supabase.from("notification_log").delete().in("farmer_id", priorIds);
    await supabase.from("farmers").delete().in("id", priorIds);
  }

  const { data: f } = await supabase.from("farmers").insert({
    name: `Stats Farmer ${TAG}`, phone: "+15052267999",
    address_text: "addr", latitude: 35.085, longitude: -106.651,
  }).select("id").single();
  farmerId = f!.id;

  const { data: r } = await supabase.from("routes").insert({
    hub_id: HUB_ID, title: `${TAG} stats-route`, route_polyline: "x",
    start_lat: 35.085, start_lng: -106.651,
    end_lat: 35.09, end_lng: -106.65,
    start_time: "2026-06-01T09:00:00Z",
    end_time: "2026-06-01T11:00:00Z",
    published: true,
  }).select("id").single();
  routeId = r!.id;

  const { data: a } = await supabase.from("route_assignments").insert({
    route_id: routeId, driver_id: DRIVER_ID, status: "in_progress",
  }).select("id").single();
  assignmentId = a!.id;

  const { data: rr } = await supabase.from("route_responses").insert({
    route_id: routeId, farmer_id: farmerId,
    response_type: "crop_pickup", status: "pending",
  }).select("id").single();
  responseId = rr!.id;
});

afterAll(async () => {
  await supabase.from("route_responses").delete().eq("id", responseId);
  await supabase.from("route_assignments").delete().eq("id", assignmentId);
  await supabase.from("routes").delete().eq("id", routeId);
  await supabase.from("farmers").delete().eq("id", farmerId);
});

describe("GET /api/hubs/[id]/stats", () => {
  it("returns counts with our seeded fixtures reflected", async () => {
    const res = await GET(new Request(`http://localhost/api/hubs/${HUB_ID}/stats`), {
      params: Promise.resolve({ id: HUB_ID }),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      nearbyGrowers: number; pickupRequests: number; activeTrips: number;
    };
    expect(json.nearbyGrowers).toBeGreaterThanOrEqual(1);
    expect(json.pickupRequests).toBeGreaterThanOrEqual(1);
    expect(json.activeTrips).toBeGreaterThanOrEqual(1);
  });

  it("400 on invalid hub id", async () => {
    const res = await GET(new Request("http://localhost/api/hubs/nope/stats"), {
      params: Promise.resolve({ id: "nope" }),
    });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run "tests/api/hubs/[id]/stats.test.ts"`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement the endpoint**

```ts
// app/api/hubs/[id]/stats/route.ts
import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Ctx) {
  const { id } = await context.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Hub id must be a UUID." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  const { data: hubRoutes, error: routesErr } = await supabase
    .from("routes")
    .select("id, start_lat, start_lng, end_lat, end_lng, published")
    .eq("hub_id", id)
    .eq("published", true);
  if (routesErr) return NextResponse.json({ error: routesErr.message }, { status: 500 });

  const routeIds = (hubRoutes ?? []).map((r) => r.id);

  // nearbyGrowers: distinct farmers within 10mi of any published route point for this hub
  let nearbyGrowers = 0;
  if (hubRoutes && hubRoutes.length > 0) {
    const points = hubRoutes.flatMap((r) => [
      { lat: r.start_lat, lng: r.start_lng },
      { lat: r.end_lat,   lng: r.end_lng   },
    ]);
    const { data: matched, error: matchErr } = await supabase.rpc(
      "find_farmers_near_route_points",
      { route_points: points, radius_miles: 10 },
    );
    if (matchErr) return NextResponse.json({ error: matchErr.message }, { status: 500 });
    nearbyGrowers = new Set((matched ?? []).map((m: { farmer_id: string }) => m.farmer_id)).size;
  }

  let pickupRequests = 0;
  let activeTrips = 0;
  if (routeIds.length > 0) {
    const [{ count: pending }, { count: active }] = await Promise.all([
      supabase.from("route_responses").select("id", { count: "exact", head: true })
        .eq("status", "pending").in("route_id", routeIds),
      supabase.from("route_assignments").select("id", { count: "exact", head: true })
        .in("status", ["started", "in_progress"]).in("route_id", routeIds),
    ]);
    pickupRequests = pending ?? 0;
    activeTrips = active ?? 0;
  }

  return NextResponse.json({ nearbyGrowers, pickupRequests, activeTrips });
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run "tests/api/hubs/[id]/stats.test.ts"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/hubs/[id]/stats/route.ts "tests/api/hubs/[id]/stats.test.ts"
git commit -m "feat(api): GET hub dashboard stats"
```

---

## Task 9: `GET /api/farmers/[id]/opportunities` + test

**Files:**
- Create: `app/api/farmers/[id]/opportunities/route.ts`
- Create: `tests/api/farmers/[id]/opportunities.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/api/farmers/[id]/opportunities.test.ts
import { config } from "dotenv";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { GET } from "@/app/api/farmers/[id]/opportunities/route";
import type { Database } from "@/lib/supabase/database.types";

config({ path: ".env.local" });

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const HUB_ID = "1e53e9e8-11db-4012-9451-f996632cd250";
const TAG = `itest-oppty-${Date.now()}`;
let farmerId = "";
let openRouteId = "";
let respondedRouteId = "";
let responseId = "";

beforeAll(async () => {
  const { data: prior } = await supabase.from("farmers").select("id").eq("phone", "+15052267998");
  const priorIds = (prior ?? []).map((f) => f.id);
  if (priorIds.length) {
    await supabase.from("route_responses").delete().in("farmer_id", priorIds);
    await supabase.from("notification_log").delete().in("farmer_id", priorIds);
    await supabase.from("farmers").delete().in("id", priorIds);
  }

  const { data: f } = await supabase.from("farmers").insert({
    name: `Oppty Farmer ${TAG}`, phone: "+15052267998",
    address_text: "addr", latitude: 35.085, longitude: -106.651,
  }).select("id").single();
  farmerId = f!.id;

  const insertRoute = async (title: string) => {
    const { data } = await supabase.from("routes").insert({
      hub_id: HUB_ID, title, route_polyline: "x",
      start_lat: 35.086, start_lng: -106.652,
      end_lat: 35.09, end_lng: -106.65,
      start_time: "2026-06-02T09:00:00Z",
      end_time: "2026-06-02T11:00:00Z",
      published: true,
    }).select("id").single();
    return data!.id;
  };
  openRouteId = await insertRoute(`${TAG} open`);
  respondedRouteId = await insertRoute(`${TAG} responded`);

  const { data: rr } = await supabase.from("route_responses").insert({
    route_id: respondedRouteId, farmer_id: farmerId,
    response_type: "crop_pickup", status: "pending",
  }).select("id").single();
  responseId = rr!.id;
});

afterAll(async () => {
  await supabase.from("route_responses").delete().eq("id", responseId);
  await supabase.from("routes").delete().in("id", [openRouteId, respondedRouteId]);
  await supabase.from("farmers").delete().eq("id", farmerId);
});

describe("GET /api/farmers/[id]/opportunities", () => {
  it("returns open routes and excludes already-responded routes", async () => {
    const res = await GET(new Request(`http://localhost/api/farmers/${farmerId}/opportunities`), {
      params: Promise.resolve({ id: farmerId }),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as Array<{ routeId: string }>;
    const routeIds = json.map((o) => o.routeId);
    expect(routeIds).toContain(openRouteId);
    expect(routeIds).not.toContain(respondedRouteId);
  });

  it("400 on invalid farmer id", async () => {
    const res = await GET(new Request("http://localhost/api/farmers/nope/opportunities"), {
      params: Promise.resolve({ id: "nope" }),
    });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run the test — verify it fails**

Run: `npx vitest run "tests/api/farmers/[id]/opportunities.test.ts"`
Expected: FAIL.

- [ ] **Step 3: Implement the endpoint**

```ts
// app/api/farmers/[id]/opportunities/route.ts
import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Ctx = { params: Promise<{ id: string }> };

function formatWindow(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const date = s.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const sTime = s.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const eTime = e.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${date} · ${sTime} - ${eTime}`;
}

export async function GET(_request: Request, context: Ctx) {
  const { id } = await context.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Farmer id must be a UUID." }, { status: 400 });
  }
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.rpc("find_routes_near_farmer", {
    farmer_id_in: id, radius_miles: 10,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const shaped = (data ?? []).map((r: {
    route_id: string; route_title: string; hub_name: string;
    start_time: string; end_time: string;
    end_lat: number; end_lng: number;
    min_distance_miles: number;
  }) => ({
    routeId: r.route_id,
    routeTitle: r.route_title,
    hubName: r.hub_name,
    routeDate: new Date(r.start_time).toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric",
    }),
    pickupWindow: formatWindow(r.start_time, r.end_time),
    destination: `${r.end_lat.toFixed(4)}, ${r.end_lng.toFixed(4)}`,
    distanceMiles: Number(r.min_distance_miles.toFixed(2)),
  }));
  return NextResponse.json(shaped);
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run "tests/api/farmers/[id]/opportunities.test.ts"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/farmers/[id]/opportunities/route.ts "tests/api/farmers/[id]/opportunities.test.ts"
git commit -m "feat(api): GET farmer opportunities excludes responded routes"
```

---

## Task 10: `GET /api/farmers/[id]/notifications` + test

**Files:**
- Create: `app/api/farmers/[id]/notifications/route.ts`
- Create: `tests/api/farmers/[id]/notifications.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/api/farmers/[id]/notifications.test.ts
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
    expect(json[0].sender).toBe("Boise Distribution Hub");
  });

  it("400 on invalid farmer id", async () => {
    const res = await GET(new Request("http://localhost/api/farmers/nope/notifications"), {
      params: Promise.resolve({ id: "nope" }),
    });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run the test — verify it fails**

Run: `npx vitest run "tests/api/farmers/[id]/notifications.test.ts"`
Expected: FAIL.

- [ ] **Step 3: Implement the endpoint**

```ts
// app/api/farmers/[id]/notifications/route.ts
import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Ctx = { params: Promise<{ id: string }> };

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${day} · ${time}`;
}

function summary(status: string, routeTitle: string) {
  if (status === "sent") return `SMS delivered about "${routeTitle}".`;
  if (status === "failed") return `SMS delivery failed for "${routeTitle}".`;
  return `You're opted out of SMS for "${routeTitle}".`;
}

export async function GET(_request: Request, context: Ctx) {
  const { id } = await context.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Farmer id must be a UUID." }, { status: 400 });
  }
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("notification_log")
    .select(`
      id, status, created_at,
      routes ( title, hubs ( name ) )
    `)
    .eq("farmer_id", id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const shaped = (data ?? []).map((row) => {
    const r = row.routes as { title: string; hubs: { name: string } | null } | null;
    const hubName = r?.hubs?.name ?? "Hub";
    const routeTitle = r?.title ?? "route";
    return {
      id: row.id,
      sender: hubName,
      timestamp: formatTimestamp(row.created_at),
      message: summary(row.status, routeTitle),
    };
  });
  return NextResponse.json(shaped);
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run "tests/api/farmers/[id]/notifications.test.ts"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/farmers/[id]/notifications/route.ts "tests/api/farmers/[id]/notifications.test.ts"
git commit -m "feat(api): GET farmer notification feed"
```

---

## Task 11: Publish-flow regression test

**Files:**
- Create: `tests/api/routes/publish-flow.test.ts`

- [ ] **Step 1: Write the test**

```ts
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
const TEST_PHONE = "+15052267853";  // verified Twilio trial destination
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
  await supabase.from("route_assignments").delete().eq("route_id", routeId);
  await supabase.from("routes").delete().eq("id", routeId);
  await supabase.from("farmers").delete().eq("id", farmerId);
});

describe("publish flow: POST /api/routes → PATCH /api/routes/[id]/publish", () => {
  it("creates route, publishes, and logs farmer notification", async () => {
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
      .select("id, status").eq("route_id", routeId).eq("farmer_id", farmerId);
    expect(log!.length).toBeGreaterThanOrEqual(1);
    expect(log![0].status).toBe("sent");
  }, 60_000);
});
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run tests/api/routes/publish-flow.test.ts`
Expected: PASS (tests the already-working backend end-to-end; no code change needed).

- [ ] **Step 3: Commit**

```bash
git add tests/api/routes/publish-flow.test.ts
git commit -m "test: regression coverage for create→publish flow"
```

---

## Task 12: Full test-suite regression check

- [ ] **Step 1: Run every test**

Run: `npm test`
Expected: all tests pass. If anything fails, stop and fix before proceeding.

- [ ] **Step 2: No commit needed if green.** If a fix was required, commit it with `fix: …`.

---

## Task 13: Add `QueryClientProvider` and wire into root layout

**Files:**
- Create: `app/providers.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create the provider**

```tsx
// app/providers.tsx
"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
    },
  }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 2: Wrap root layout**

In `app/layout.tsx`, import `{ Providers }` from `./providers` and wrap `{children}`:
```tsx
import { Providers } from "./providers";
// ...
<body>
  <Providers>{children}</Providers>
</body>
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add app/providers.tsx app/layout.tsx
git commit -m "feat: wire react-query provider into root layout"
```

---

## Task 14: Create `lib/api/client.ts` typed fetch wrappers

**Files:**
- Create: `lib/api/client.ts`

- [ ] **Step 1: Write the module**

```ts
// lib/api/client.ts
import type { DriverRouteAssignment, FarmerNotification } from "@/lib/types";

async function http<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string })?.error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export type HubSummary = { id: string; name: string; phone: string; email: string };
export type HubStats = { nearbyGrowers: number; pickupRequests: number; activeTrips: number };
export type DriverSummary = {
  id: string; hubId: string; firstName: string; lastName: string;
  phone: string; vehicle: string | null; zone: string | null; avatarUrl: string | null;
};
export type FarmerOpportunity = {
  routeId: string; routeTitle: string; hubName: string;
  routeDate: string; pickupWindow: string; destination: string; distanceMiles: number;
};

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
    http<Array<Record<string, unknown>>>(hubId ? `/api/routes?hub_id=${hubId}` : "/api/routes"),
  createRoute: (payload: Record<string, unknown>) =>
    http<Record<string, unknown> & { id: string }>("/api/routes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }),
  publishRoute: (routeId: string) =>
    http<{ farmers_notified: number; notifications: Array<{ status: string }> }>(
      `/api/routes/${routeId}/publish`,
      { method: "PATCH" },
    ),
};
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add lib/api/client.ts
git commit -m "feat: typed fetch wrappers for new endpoints"
```

---

## Task 15: Move `routeScenarios` and `heroStats` out of mock-data

**Files:**
- Create: `lib/config/scenarios.ts`
- Create: `lib/config/landing.ts`

- [ ] **Step 1: Create `lib/config/scenarios.ts`**

Copy the full `routeScenarios` array from `lib/mock-data.ts` (lines 145–270) into a new file:

```ts
// lib/config/scenarios.ts
import type { RouteScenario } from "@/lib/types";

export const routeScenarios: RouteScenario[] = [
  /* paste the array contents from lib/mock-data.ts:145-270 verbatim */
];
```

- [ ] **Step 2: Create `lib/config/landing.ts`**

```ts
// lib/config/landing.ts
export const heroStats = [
  {
    label: "Routes this week",
    value: "24",
    detail: "Mock regional trips that can carry produce or compost loads.",
  },
  {
    label: "Farmers notified",
    value: "142",
    detail: "Nearby growers matched to routes based on geography and timing.",
  },
  {
    label: "Return compost runs",
    value: "9",
    detail: "Backhaul opportunities that keep trucks useful in both directions.",
  },
];
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: succeeds (`mock-data.ts` is still imported elsewhere; don't delete yet).

- [ ] **Step 4: Commit**

```bash
git add lib/config/scenarios.ts lib/config/landing.ts
git commit -m "chore: extract route scenarios and landing stats into lib/config"
```

---

## Task 16: Rewrite `/farmer` page with React Query

**Files:**
- Modify: `app/farmer/page.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
// app/farmer/page.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { FarmerOpportunityCard } from "@/components/farmer-opportunity-card";
import { LoadCapacityEstimator } from "@/components/load-capacity-estimator";
import { Navbar } from "@/components/navbar";
import { NotificationCard } from "@/components/notification-card";
import { SidebarNav } from "@/components/sidebar-nav";
import { api } from "@/lib/api/client";
import type { PickupOpportunity } from "@/lib/types";

function FarmerDashboard() {
  const farmerId = useSearchParams().get("id") ?? "";

  const opportunitiesQ = useQuery({
    queryKey: ["opportunities", farmerId],
    queryFn: () => api.listOpportunities(farmerId),
    enabled: !!farmerId,
  });

  const notificationsQ = useQuery({
    queryKey: ["notifications", farmerId],
    queryFn: () => api.listNotifications(farmerId),
    enabled: !!farmerId,
  });

  if (!farmerId) {
    return (
      <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-700">
          Add <code>?id=&lt;farmer-uuid&gt;</code> to the URL to view a farmer dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">
          Upcoming pickup opportunities
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
          Nearby routes you can join this week
        </h1>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {opportunitiesQ.isLoading && <p className="text-sm text-slate-600">Loading opportunities…</p>}
        {opportunitiesQ.isError && (
          <button
            type="button"
            onClick={() => opportunitiesQ.refetch()}
            className="rounded-[1.5rem] border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            Failed to load opportunities. Tap to retry.
          </button>
        )}
        {opportunitiesQ.data?.length === 0 && (
          <p className="text-sm text-slate-600">No open routes near you right now.</p>
        )}
        {opportunitiesQ.data?.map((o) => {
          const opportunity: PickupOpportunity = {
            id: o.routeId,
            routeName: o.routeTitle,
            farmArea: `${o.distanceMiles} mi away`,
            contactName: o.hubName,
            contactPhone: "",
            pickupWindow: o.pickupWindow,
            destination: o.destination,
            notes: `Date: ${o.routeDate}`,
            status: "Open",
          };
          return <FarmerOpportunityCard key={o.routeId} opportunity={opportunity} />;
        })}
      </section>

      <LoadCapacityEstimator
        role="farmer"
        title="Estimate how much of your pickup bed this load will use"
        description="Snap a photo of produce, compost, or materials waiting for pickup and get a quick visual estimate of how much transport space it may occupy."
      />

      <section className="rounded-[2rem] border border-stone-200 bg-stone-950 p-6 text-stone-50 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-300">SMS alerts</p>
            <h2 className="mt-2 text-2xl font-semibold">Message feed</h2>
          </div>
        </div>
        <div className="mt-5 grid gap-3">
          {notificationsQ.isLoading && <p className="text-sm text-stone-300">Loading messages…</p>}
          {notificationsQ.isError && (
            <button
              type="button"
              onClick={() => notificationsQ.refetch()}
              className="rounded-[1.25rem] border border-red-300 bg-red-950 p-4 text-sm text-red-100"
            >
              Failed to load notifications. Tap to retry.
            </button>
          )}
          {notificationsQ.data?.length === 0 && (
            <p className="text-sm text-stone-300">No messages yet.</p>
          )}
          {notificationsQ.data?.map((n) => (
            <NotificationCard key={n.id} notification={n} dark />
          ))}
        </div>
      </section>
    </div>
  );
}

export default function FarmerDashboardPage() {
  return (
    <div className="min-h-screen bg-stone-100">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
          <SidebarNav
            title="Farmer view"
            subtitle="Simple pickup coordination"
            items={[
              { href: "/farmer", label: "Opportunities" },
              { href: "/routes", label: "Route planning" },
              { href: "/auth/sign-in", label: "Sign in" },
            ]}
          />
          <Suspense fallback={<p className="text-sm text-slate-600">Loading…</p>}>
            <FarmerDashboard />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev`. Open `http://localhost:3000/farmer?id=<farmer-uuid-from-db>` (query Supabase for an existing farmer id). Verify opportunities and notifications render (empty states acceptable if no data).

- [ ] **Step 4: Commit**

```bash
git add app/farmer/page.tsx
git commit -m "feat(farmer): wire opportunities and notifications to backend"
```

---

## Task 17: Rewrite `/driver` page with React Query + status PATCH

**Files:**
- Modify: `app/driver/page.tsx`
- Modify: `components/driver-dashboard.tsx`

- [ ] **Step 1: Replace `app/driver/page.tsx`**

```tsx
// app/driver/page.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { DriverDashboard } from "@/components/driver-dashboard";
import { Navbar } from "@/components/navbar";
import { api } from "@/lib/api/client";

function DriverPageInner() {
  const driverId = useSearchParams().get("id") ?? "";

  const driversQ = useQuery({
    queryKey: ["drivers"],
    queryFn: () => api.listDrivers(),
  });
  const assignmentsQ = useQuery({
    queryKey: ["assignments", driverId],
    queryFn: () => api.listAssignments(driverId),
    enabled: !!driverId,
  });

  if (!driverId) {
    return <p className="text-sm text-slate-700">Add <code>?id=&lt;driver-uuid&gt;</code> to the URL.</p>;
  }

  const driver = driversQ.data?.find((d) => d.id === driverId);
  if (driversQ.isLoading || assignmentsQ.isLoading) return <p className="text-sm">Loading…</p>;
  if (driversQ.isError || assignmentsQ.isError) {
    return (
      <button
        type="button"
        onClick={() => { driversQ.refetch(); assignmentsQ.refetch(); }}
        className="rounded-[1.5rem] border border-red-200 bg-red-50 p-4 text-sm text-red-800"
      >
        Failed to load. Tap to retry.
      </button>
    );
  }
  if (!driver) return <p className="text-sm">Driver not found.</p>;

  return (
    <DriverDashboard
      driver={{
        id: driver.id,
        firstName: driver.firstName,
        lastName: driver.lastName,
        avatarUrl: driver.avatarUrl ?? "",
        vehicle: driver.vehicle ?? "",
        phone: driver.phone,
        zone: driver.zone ?? "",
      }}
      assignments={assignmentsQ.data ?? []}
    />
  );
}

export default function DriverPage() {
  return (
    <div className="min-h-screen bg-stone-100">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Suspense fallback={<p className="text-sm">Loading…</p>}>
          <DriverPageInner />
        </Suspense>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Update `components/driver-dashboard.tsx` to accept a single `driver` and mutate status via API**

At the top of the file replace the prop type and remove the `drivers` array selection. Replace:
```ts
export function DriverDashboard({
  drivers,
  assignments,
}: {
  drivers: Driver[];
  assignments: DriverRouteAssignment[];
}) {
  const selectedDriverId = drivers[0]?.id ?? "";
  const [routeStates, setRouteStates] = useState(assignments);
  // ...
  const selectedDriver = drivers.find((driver) => driver.id === selectedDriverId) ?? drivers[0];
  const driverAssignments = useMemo(
    () => routeStates.filter((assignment) => assignment.driverId === selectedDriverId),
    [routeStates, selectedDriverId],
  );
```

with:

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

export function DriverDashboard({
  driver,
  assignments,
}: {
  driver: Driver;
  assignments: DriverRouteAssignment[];
}) {
  const queryClient = useQueryClient();
  const [uploadedImages, setUploadedImages] = useState<Record<string, string>>({});
  const [submittedChecks, setSubmittedChecks] = useState<Record<string, boolean>>({});
  const selectedDriver = driver;
  const driverAssignments = assignments;

  const statusMutation = useMutation({
    mutationFn: ({ assignmentId, status }: { assignmentId: string; status: DriverRouteStatus }) =>
      api.updateAssignmentStatus(driver.id, assignmentId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assignments", driver.id] }),
  });
```

Remove the existing `useState(assignments)` / `setRouteStates` state and replace the `updateStatus` function body with:

```ts
const updateStatus = (assignmentId: string, status: DriverRouteStatus) => {
  statusMutation.mutate({ assignmentId, status });
};
```

Delete the now-unused `useMemo` import if appropriate, and keep the rest of the render tree intact (it already reads from `driverAssignments` and `selectedDriver`).

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Manual smoke test**

`npm run dev` → `/driver?id=d0000001-0000-0000-0000-000000000001` with a seeded route assignment (create one via the planner or directly in Supabase). Change the status dropdown and confirm the DB row updates.

- [ ] **Step 5: Commit**

```bash
git add app/driver/page.tsx components/driver-dashboard.tsx
git commit -m "feat(driver): load assignments from API and PATCH status updates"
```

---

## Task 18: Rewrite `/hub` page with React Query

**Files:**
- Modify: `app/hub/page.tsx`
- Modify: `components/hub-dashboard-shell.tsx`

- [ ] **Step 1: Replace `app/hub/page.tsx`**

```tsx
// app/hub/page.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { HubDashboardShell } from "@/components/hub-dashboard-shell";
import { Navbar } from "@/components/navbar";
import { api } from "@/lib/api/client";

const DEFAULT_HUB_ID = "1e53e9e8-11db-4012-9451-f996632cd250";

function HubPageInner() {
  const hubId = useSearchParams().get("id") ?? DEFAULT_HUB_ID;
  const statsQ = useQuery({ queryKey: ["hubStats", hubId], queryFn: () => api.hubStats(hubId) });
  const routesQ = useQuery({ queryKey: ["routes", hubId], queryFn: () => api.listRoutes(hubId) });

  if (statsQ.isLoading || routesQ.isLoading) return <p className="text-sm">Loading…</p>;
  if (statsQ.isError || routesQ.isError) {
    return (
      <button
        type="button"
        onClick={() => { statsQ.refetch(); routesQ.refetch(); }}
        className="rounded-[1.5rem] border border-red-200 bg-red-50 p-4 text-sm text-red-800"
      >
        Failed to load. Tap to retry.
      </button>
    );
  }

  return (
    <HubDashboardShell
      stats={statsQ.data!}
      routes={(routesQ.data as Array<{
        id: string; title: string; hubs?: { name?: string } | null;
        start_time: string; end_time: string; start_lat: number; start_lng: number;
        end_lat: number; end_lng: number; notes: string | null; published: boolean;
      }>) ?? []}
    />
  );
}

export default function HubDashboardPage() {
  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Suspense fallback={<p className="text-sm">Loading…</p>}>
          <HubPageInner />
        </Suspense>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Replace `components/hub-dashboard-shell.tsx` mock-data reads with props**

Top of the file: add a typed prop interface, remove the `import { hubOperationalStats, routePlans } from "@/lib/mock-data";` line, and replace `useState(routePlans[0].id)` with state keyed off the new `routes` prop.

```tsx
"use client";

import { useState } from "react";
import { DashboardStatCard } from "@/components/dashboard-stat-card";
import { LoadCapacityEstimator } from "@/components/load-capacity-estimator";
import { RouteForm } from "@/components/route-form";
import { SidebarNav } from "@/components/sidebar-nav";
import { StatusBadge } from "@/components/status-badge";

export type HubRoute = {
  id: string;
  title: string;
  hubs?: { name?: string } | null;
  start_time: string;
  end_time: string;
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  notes: string | null;
  published: boolean;
};

export function HubDashboardShell({
  stats,
  routes,
}: {
  stats: { nearbyGrowers: number; pickupRequests: number; activeTrips: number };
  routes: HubRoute[];
}) {
  const [selectedRouteId, setSelectedRouteId] = useState(routes[0]?.id ?? "");
  const selectedRoute = routes.find((r) => r.id === selectedRouteId) ?? routes[0];

  const statCards = [
    { label: "Nearby growers", value: String(stats.nearbyGrowers),
      detail: "Eligible contacts along active route corridors." },
    { label: "Pickup requests", value: String(stats.pickupRequests),
      detail: "Open farmer responses waiting for dispatch review." },
    { label: "Active trips", value: String(stats.activeTrips),
      detail: "Live or upcoming deliveries visible to the operations team." },
  ];
  /* keep the rest of the component's JSX tree intact, but:
     - replace `hubOperationalStats.map(...)` with `statCards.map(...)`
     - replace `routePlans.length` with `routes.length`
     - replace `routePlans.map((route) => ...)` with `routes.map((route) => ...)`
     - inside each card, replace:
         route.startLocation -> `${route.start_lat.toFixed(3)}, ${route.start_lng.toFixed(3)}`
         route.endLocation   -> `${route.end_lat.toFixed(3)}, ${route.end_lng.toFixed(3)}`
         route.status        -> (route.published ? "Open" : "Draft")
         route.nearbyFarmers -> 0  (real count moved to hub stats)
         route.pickupRequests -> 0
         route.startTime     -> route.start_time
         route.endTime       -> route.end_time
         route.notes         -> route.notes ?? ""
     - wrap `<StatusBadge status={...} />` with the boolean→status string mapping above.
  */
}
```

Apply these textual substitutions throughout the existing JSX (the structure from the old file stays; only the data references change). The `empty routes` case should render a neutral "No routes yet" card.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Manual smoke test**

`/hub?id=1e53e9e8-11db-4012-9451-f996632cd250` renders stats and routes. Empty route list renders a neutral card.

- [ ] **Step 5: Commit**

```bash
git add app/hub/page.tsx components/hub-dashboard-shell.tsx
git commit -m "feat(hub): load stats and routes from backend"
```

---

## Task 19: Rewrite planner to load drivers from API and fix publish flow

**Files:**
- Modify: `app/routes/page.tsx`
- Modify: `components/google-route-planner.tsx`

- [ ] **Step 1: Replace `app/routes/page.tsx`**

```tsx
// app/routes/page.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { GoogleRoutePlanner } from "@/components/google-route-planner";
import { Navbar } from "@/components/navbar";
import { routeScenarios } from "@/lib/config/scenarios";

const DEFAULT_HUB_ID = "1e53e9e8-11db-4012-9451-f996632cd250";

function RoutePageInner() {
  const hubId = useSearchParams().get("hub") ?? DEFAULT_HUB_ID;
  return <GoogleRoutePlanner scenarios={routeScenarios} hubId={hubId} />;
}

export default function RoutePlanningPage() {
  return (
    <div className="h-screen overflow-hidden bg-[linear-gradient(180deg,#eef3f1_0%,#f5f7f6_100%)]">
      <Navbar />
      <main className="mx-auto flex h-[calc(100vh-76px)] max-w-7xl flex-col overflow-hidden px-4 py-4 sm:px-6 lg:px-8">
        <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
          <div className="min-h-0 flex-1 overflow-hidden">
            <Suspense fallback={<p className="text-sm">Loading…</p>}>
              <RoutePageInner />
            </Suspense>
          </div>
        </section>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Modify `components/google-route-planner.tsx`**

Change the prop signature:

```ts
// at the top, add:
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
```

Replace:
```ts
export function GoogleRoutePlanner({
  scenarios,
  drivers,
  compact = false,
}: {
  scenarios: RouteScenario[];
  drivers: Driver[];
  compact?: boolean;
})
```
with:
```ts
export function GoogleRoutePlanner({
  scenarios,
  hubId,
  compact = false,
}: {
  scenarios: RouteScenario[];
  hubId: string;
  compact?: boolean;
}) {
  const driversQ = useQuery({
    queryKey: ["drivers", hubId],
    queryFn: () => api.listDrivers(hubId),
  });
  const drivers = (driversQ.data ?? []).map((d) => ({
    id: d.id,
    firstName: d.firstName,
    lastName: d.lastName,
    avatarUrl: d.avatarUrl ?? "",
    vehicle: d.vehicle ?? "",
    phone: d.phone,
    zone: d.zone ?? "",
  }));
```

Delete the `const DEMO_HUB_ID = "1e53e9e8-…"` line.

Replace the existing `sendRouteToDriver` implementation with a two-step mutation:

```ts
const [notifyResult, setNotifyResult] = useState<{ notified: number; failed: number } | null>(null);

const publishMutation = useMutation({
  mutationFn: async (payload: Record<string, unknown>) => {
    const created = await api.createRoute(payload);
    const pub = await api.publishRoute(created.id);
    return { created, pub };
  },
  onSuccess: ({ pub }) => {
    const notified = pub.farmers_notified ?? 0;
    const failed = (pub.notifications ?? []).filter((n) => n.status === "failed").length;
    setNotifyResult({ notified, failed });
    setRouteSent(true);
  },
  onError: (err) => setSendError(err instanceof Error ? err.message : String(err)),
});

const sendRouteToDriver = () => {
  setSendError(null);
  setNotifyResult(null);
  const originMarker = routeMarkers.find((m) => m.kind === "origin");
  const destMarker = routeMarkers.find((m) => m.kind === "destination");
  if (!originMarker || !destMarker) {
    setSendError("Route must have an origin and destination.");
    return;
  }
  if (!selectedDriver) {
    setSendError("Pick a driver before sending the route.");
    return;
  }

  const start = new Date();
  const end = new Date(start.getTime() + 4 * 60 * 60 * 1000);
  const polyline = routeMarkers
    .map((m) => `${m.position.lat.toFixed(5)},${m.position.lng.toFixed(5)}`)
    .join("|");
  const pickupList = pickups.filter((p) => p.trim().length > 0);
  const notes = pickupList.length ? `Pickups: ${pickupList.join(" -> ")}` : null;

  publishMutation.mutate({
    hub_id: hubId,
    driver_id: selectedDriver.id,
    title: selectedScenario?.title || `Route to ${destination}`,
    route_polyline: polyline || "planner-route",
    start_lat: originMarker.position.lat,
    start_lng: originMarker.position.lng,
    end_lat: destMarker.position.lat,
    end_lng: destMarker.position.lng,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    notes,
  });
};
```

Replace the local `sending` state with `publishMutation.isPending` everywhere it was used.

In the JSX success panel, show `notifyResult` when present:
```tsx
{notifyResult ? (
  <p className="mt-2 text-sm text-emerald-800">
    {notifyResult.notified} farmers notified, {notifyResult.failed} failed.
  </p>
) : null}
```

If `driversQ.isLoading`, render a disabled driver picker. If `drivers.length === 0`, disable the "Send route" button with a note: "No drivers available for this hub."

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Manual smoke test**

`npm run dev` → `/routes`. Pick a driver, click "Send route". Observe:
- A new `routes` row (published=true).
- A new `route_assignments` row.
- A new `notification_log` row for any farmer within 10mi.
- UI shows "N farmers notified".

- [ ] **Step 5: Commit**

```bash
git add app/routes/page.tsx components/google-route-planner.tsx
git commit -m "fix(routes): two-step publish flow wires UI to farmer SMS"
```

---

## Task 20: Clean landing page and delete dead mock + empty dirs

**Files:**
- Modify: `app/page.tsx`
- Delete: `lib/mock-data.ts`
- Delete: `app/api/routes/publish-new/`
- Delete: `app/api/notify-demo/`

- [ ] **Step 1: Update `app/page.tsx` to use only `heroStats` from config**

Replace the import:
```ts
import { heroStats } from "@/lib/config/landing";
```
Remove references to `pickupOpportunities`, `farmerNotifications`, `hubOperationalStats`, and `routePlans`. Replace the two mock-data-driven sections (the "Farmer experience" and "Hub operations" cards) with static marketing copy — no data binding. Keep `MapPlaceholder`; replace the `route={routePlans[0]}` prop with a hard-coded props object at the call site matching `MapPlaceholder`'s expected shape (check `components/map-placeholder.tsx` for the type).

- [ ] **Step 2: Delete mock-data file**

```bash
git rm lib/mock-data.ts
```

- [ ] **Step 3: Delete empty API shells**

```bash
git rm -r app/api/routes/publish-new app/api/notify-demo
```

- [ ] **Step 4: Verify build and full test suite**

Run: `npm run build && npm test`
Expected: both green.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx
git commit -m "chore: remove mock-data and empty API directories"
```

---

## Task 21: Final verification

- [ ] **Step 1: Grep for any remaining `mock-data` imports**

Run:
```bash
git grep -l "from \"@/lib/mock-data\"" || echo "none"
```
Expected: `none`.

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: all tests pass (including `publish-flow.test.ts`).

- [ ] **Step 3: Run a build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Manual QA checklist**

With `npm run dev` running:
- `/` renders (no mock imports).
- `/routes` — driver dropdown populates from API, sending a route returns "N farmers notified".
- `/farmer?id=<seeded farmer>` — opportunities list and notification feed render from DB.
- `/driver?id=d0000001-0000-0000-0000-000000000001` — assignments list renders, changing a status persists.
- `/hub?id=1e53e9e8-11db-4012-9451-f996632cd250` — three stat cards show real counts, route list populated.
- `/respond?route=<uuid>&farmer=<uuid>` — still works (untouched).

- [ ] **Step 5: No commit — merge the branch**

Let the user decide how to merge. Do not push without explicit approval.

---

## Risks & Notes

- **Supabase CLI command in Task 2**: if `npx supabase db push` isn't the established workflow in this project, pause and ask the user which command applies migrations to their Supabase project before running it.
- **Twilio credentials required**: `publish-flow.test.ts` and `routes/create.test.ts` hit Twilio. Ensure `.env.local` has valid creds before running.
- **Verified phone uniqueness**: farmer phone is `UNIQUE`. Tests each reuse a different `+1505226799X` number but still clean up squatters. If tests start colliding, renumber.
- **`routes` GET response shape**: the existing `GET /api/routes` returns raw Supabase rows (with `hubs` join). `HubDashboardShell` consumes this shape directly. If the shape changes, both must move together.
- **No type regeneration in CI**: generating `database.types.ts` is a manual step. If subsequent tasks reference new table types and TypeScript complains, re-run Task 2 Step 3.
