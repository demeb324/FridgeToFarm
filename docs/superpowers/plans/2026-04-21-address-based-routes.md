# Address-Based Routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve the multi-route planner so every route is defined by human-readable addresses (origin, destination, and an ordered list of intermediate pickup stops). The server geocodes addresses, calls the Directions API for the encoded polyline, and persists derived lat/lng — users never enter raw coordinates.

**Architecture:** Add `start_address` / `end_address` columns to `routes` and a new `route_stops` table. Two thin service modules (`lib/services/geocode.ts`, `lib/services/directions.ts`) wrap the Google APIs. POST and PATCH handlers drop lat/lng from the request contract, geocode every changed address in-process, reject the whole save on any failure (422 with field-level detail), then call Directions, store the polyline, and trigger the existing `publishRoute` re-broadcast path unchanged. The GET path joins `route_stops` and adds them to the `RouteRow` type. The frontend replaces four lat/lng number inputs with address text fields and adds an add/remove/reorder stops section (up/down buttons, no DnD library). The map gains numbered circular stop pins.

**Security note:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is browser-exposed by its prefix. Server-side geocoding and Directions calls should ideally use a separate `GOOGLE_MAPS_SERVER_KEY` env var restricted to the Geocoding and Directions APIs with no referrer restriction. This plan introduces `GOOGLE_MAPS_SERVER_KEY` and falls back to `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` if it is absent — flagged as a known gap that should be addressed before production launch.

**Tech Stack:** Next.js App Router (route handlers — `params` is a `Promise`, awaited per existing convention in `app/api/routes/[id]/route.ts`), Supabase (Postgres), TanStack Query v5, `@vis.gl/react-google-maps`, Vitest integration tests with `fetch` mocked at network layer for Google APIs.

**Prerequisite:** Tasks 1–11 of `docs/superpowers/plans/2026-04-21-multi-route-planner.md` are fully shipped (they are — commit `42a4584`).

---

## File Map

**Backend — new/changed files:**

| File | Responsibility |
|------|----------------|
| `supabase/migrations/20260421180000_address_based_routes.sql` (new) | Add `start_address`, `end_address` to `routes`; create `route_stops` table; backfill placeholder addresses for existing seed rows. |
| `lib/services/geocode.ts` (new) | `geocodeAddress(address)` — calls Google Geocoding API, returns `{ lat, lng }` or throws `GeocodeError`. |
| `lib/services/directions.ts` (new) | `getDirectionsPolyline(origin, destination, waypoints)` — calls Directions API, returns encoded polyline string or throws `DirectionsError`. |
| `lib/supabase/database.types.ts` (modify) | Add `start_address`, `end_address` to `routes` rows/insert/update; add `route_stops` table definition. |
| `app/api/routes/route.ts` (modify) | POST accepts `start_address`, `end_address`, `stops[]`; drops lat/lng from body; geocodes + directions; inserts stops. |
| `app/api/routes/[id]/route.ts` (modify) | PATCH accepts `start_address`, `end_address`, `stops[]`; re-geocodes changed addresses; replaces stops; re-runs directions; re-broadcasts. |
| `tests/api/routes/create-address.test.ts` (new) | Integration tests for address-based POST. |
| `tests/api/routes/[id]/patch-address.test.ts` (new) | Integration tests for address-based PATCH. |
| `tests/vitest.setup.ts` (modify) | Add `fetch` mock interceptors for Google Geocoding and Directions API hostnames. |

**Frontend — new/changed files:**

| File | Responsibility |
|------|----------------|
| `lib/api/client.ts` (modify) | Update `RouteRow` (add `start_address`, `end_address`, `stops`); update `RouteUpdatePayload`; add `RouteStop` type; add `RouteCreatePayload` type. |
| `components/routes/route-editor.tsx` (modify) | Replace lat/lng inputs with address fields; add Stops section with add/remove/up/down reorder. |
| `components/routes/route-map.tsx` (modify) | Render numbered circular stop pins for selected route. |

---

## Conventions (carry-forward from prior plan)

- **Error envelope:** `{ error: string }` on failure, `{ field: string, message: string }` for 422 geocode failures.
- **Validation:** helpers from `lib/api/validation.ts` (`asString`, `isRecord`, etc.).
- **Supabase client:** `createAdminSupabaseClient()` from `@/lib/supabase/server`.
- **Route handler params:** `params: Promise<{ id: string }>` — always `await context.params` (Next.js App Router convention confirmed in `app/api/routes/[id]/route.ts`).
- **Test pattern:** `itest-<feature>-${Date.now()}` tag, `beforeAll` setup, `afterAll` cleanup in reverse insertion order, direct handler import (no HTTP server).
- **Commits:** one logical commit per task, format `feat(scope): short summary`.

---

## Intermediate broken states

- After Task 1 (migration only): the app still works — new columns have DB-level defaults; existing seed routes get placeholder addresses; `route_stops` table exists but is empty. No code touches it yet.
- After Task 4 (Vitest setup): no behaviour change; mocks only activate in test runs.
- After Task 5 (POST rewrite): POST no longer accepts `start_lat`/`start_lng`/`end_lat`/`end_lng` from the body — the existing `tests/api/routes/create.test.ts` will fail. **Task 5 must update that test file** to use addresses instead of raw lat/lng. This is called out explicitly in Task 5.
- After Task 6 (PATCH rewrite): similarly, `tests/api/routes/[id]/patch.test.ts` sends raw lat/lng — Task 6 updates it.
- Tasks 8–9 (frontend) are safe to develop in parallel with Tasks 5–7 behind a feature flag (the editor simply won't compile until both sides land), but they are sequenced here for a clean stacked-PR tree.

---

## Task 1: Migration — `start_address`, `end_address`, `route_stops`

**Goal:** All schema changes land as a single idempotent migration so subsequent tasks can rely on the columns existing.

**Files:**
- Create: `supabase/migrations/20260421180000_address_based_routes.sql`
- Modify: `lib/supabase/database.types.ts`

- [ ] **Step 1: Write the migration**

`supabase/migrations/20260421180000_address_based_routes.sql`:

```sql
-- ============================================================
-- Address-based routes: schema additions
-- ============================================================

-- 1. Add address columns to routes (default '' so NOT NULL is satisfied
--    for existing rows before the backfill below).
ALTER TABLE routes
  ADD COLUMN IF NOT EXISTS start_address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS end_address   text NOT NULL DEFAULT '';

-- 2. Backfill the two demo seed rows with human-readable placeholder
--    addresses. Real re-seeding with proper addresses happens below.
UPDATE routes
SET
  start_address = CONCAT(start_lat::text, ', ', start_lng::text),
  end_address   = CONCAT(end_lat::text,   ', ', end_lng::text)
WHERE start_address = '';

-- 3. route_stops table
CREATE TABLE IF NOT EXISTS route_stops (
  id           uuid        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  route_id     uuid        NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  order_index  int         NOT NULL,
  address      text        NOT NULL,
  name         text,
  latitude     float8      NOT NULL,
  longitude    float8      NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (route_id, order_index)
);

CREATE INDEX IF NOT EXISTS idx_route_stops_route_id ON route_stops (route_id);

-- 4. Re-seed demo routes with real Albuquerque-area addresses and one
--    stop each. Use ON CONFLICT DO UPDATE so the migration is re-runnable.

-- Route 1: Albuquerque → Santa Fe
UPDATE routes SET
  start_address = '400 Marquette Ave NW, Albuquerque, NM 87102',
  end_address   = '63 Lincoln Ave, Santa Fe, NM 87501'
WHERE id = 'a0000001-0000-0000-0000-000000000001';

-- Route 2: South Valley connector
UPDATE routes SET
  start_address = '2100 Louisiana Blvd NE, Albuquerque, NM 87110',
  end_address   = '4601 Yale Blvd SE, Albuquerque, NM 87108'
WHERE id = 'a0000002-0000-0000-0000-000000000002';

-- Seed one stop per demo route (lat/lng approximate; real geocoded values
-- will overwrite when a user saves the route through the UI).
INSERT INTO route_stops (route_id, order_index, address, name, latitude, longitude)
VALUES
  (
    'a0000001-0000-0000-0000-000000000001', 0,
    '1 Bernalillo Town Center, Bernalillo, NM 87004',
    'Bernalillo Pickup',
    35.3003, -106.5531
  ),
  (
    'a0000002-0000-0000-0000-000000000002', 0,
    '1500 Rio Bravo Blvd SW, Albuquerque, NM 87105',
    'Rio Bravo Stop',
    35.0411, -106.6793
  )
ON CONFLICT (route_id, order_index) DO NOTHING;
```

- [ ] **Step 2: Update `lib/supabase/database.types.ts`**

In the `routes` table definition, add `start_address: string` and `end_address: string` to `Row`, `Insert` (required, no default), and `Update` (optional).

Add a new `route_stops` table entry to `Tables`:

```ts
route_stops: {
  Row: {
    id: string
    route_id: string
    order_index: number
    address: string
    name: string | null
    latitude: number
    longitude: number
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    route_id: string
    order_index: number
    address: string
    name?: string | null
    latitude: number
    longitude: number
    created_at?: string
    updated_at?: string
  }
  Update: {
    id?: string
    route_id?: string
    order_index?: number
    address?: string
    name?: string | null
    latitude?: number
    longitude?: number
    created_at?: string
    updated_at?: string
  }
  Relationships: [
    {
      foreignKeyName: "route_stops_route_id_fkey"
      columns: ["route_id"]
      isOneToOne: false
      referencedRelation: "routes"
      referencedColumns: ["id"]
    }
  ]
}
```

- [ ] **Step 3: Apply migration to local Supabase**

```bash
npx supabase db push
```

Expected: migration applies cleanly; `\d routes` shows `start_address` and `end_address`; `\d route_stops` shows the new table.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260421180000_address_based_routes.sql lib/supabase/database.types.ts
git commit -m "feat(db): add start_address, end_address to routes and route_stops table"
```

---

## Task 2: `lib/services/geocode.ts` + unit tests

**Goal:** Pure service that takes an address string, calls the Google Geocoding API, and returns `{ lat, lng }`. Any non-OK result throws a typed error so callers can surface field-level messages.

**Files:**
- Create: `lib/services/geocode.ts`
- Create: `tests/lib/services/geocode.test.ts`

- [ ] **Step 1: Write the failing tests**

`tests/lib/services/geocode.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// fetch is mocked globally in vitest.setup.ts after Task 4.
// For this test file we install a local override.
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { geocodeAddress, GeocodeError } from "@/lib/services/geocode";

const OK_RESPONSE = {
  status: "OK",
  results: [{ geometry: { location: { lat: 35.0844, lng: -106.6504 } } }],
};

function makeResponse(body: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

beforeEach(() => {
  mockFetch.mockReset();
  process.env.GOOGLE_MAPS_SERVER_KEY = "test-server-key";
});

describe("geocodeAddress", () => {
  it("returns lat/lng for a valid address", async () => {
    mockFetch.mockReturnValue(makeResponse(OK_RESPONSE));
    const result = await geocodeAddress("400 Marquette Ave NW, Albuquerque, NM");
    expect(result.lat).toBeCloseTo(35.0844);
    expect(result.lng).toBeCloseTo(-106.6504);
  });

  it("includes the API key and encoded address in the URL", async () => {
    mockFetch.mockReturnValue(makeResponse(OK_RESPONSE));
    await geocodeAddress("Test Address");
    const url: string = mockFetch.mock.calls[0][0];
    expect(url).toContain("maps.googleapis.com/maps/api/geocode");
    expect(url).toContain("test-server-key");
    expect(url).toContain(encodeURIComponent("Test Address"));
  });

  it("throws GeocodeError when status is ZERO_RESULTS", async () => {
    mockFetch.mockReturnValue(makeResponse({ status: "ZERO_RESULTS", results: [] }));
    await expect(geocodeAddress("Nowhere, XZ")).rejects.toBeInstanceOf(GeocodeError);
  });

  it("throws GeocodeError when fetch response is not ok", async () => {
    mockFetch.mockReturnValue(makeResponse({}, false, 500));
    await expect(geocodeAddress("Test")).rejects.toBeInstanceOf(GeocodeError);
  });

  it("falls back to NEXT_PUBLIC_GOOGLE_MAPS_API_KEY when server key is absent", async () => {
    delete process.env.GOOGLE_MAPS_SERVER_KEY;
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = "public-fallback-key";
    mockFetch.mockReturnValue(makeResponse(OK_RESPONSE));
    await geocodeAddress("Test");
    const url: string = mockFetch.mock.calls[0][0];
    expect(url).toContain("public-fallback-key");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/lib/services/geocode.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/services/geocode'`.

- [ ] **Step 3: Implement `lib/services/geocode.ts`**

```ts
export class GeocodeError extends Error {
  constructor(
    public readonly address: string,
    message: string,
  ) {
    super(message);
    this.name = "GeocodeError";
  }
}

export type GeocodeResult = { lat: number; lng: number };

/**
 * Geocodes a single address string using the Google Geocoding API.
 * Prefers GOOGLE_MAPS_SERVER_KEY; falls back to NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
 *
 * Security: callers should pass `GOOGLE_MAPS_SERVER_KEY` (a server-only key
 * restricted to Geocoding + Directions, with no referrer restriction).
 * The NEXT_PUBLIC_ fallback is browser-exposed — flag for ops to fix.
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const apiKey =
    process.env.GOOGLE_MAPS_SERVER_KEY ??
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ??
    "";

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;

  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new GeocodeError(address, `Network error geocoding "${address}": ${String(err)}`);
  }

  if (!res.ok) {
    throw new GeocodeError(address, `Geocoding request failed (HTTP ${res.status}) for "${address}"`);
  }

  const data = (await res.json()) as { status: string; results: Array<{ geometry: { location: { lat: number; lng: number } } }> };

  if (data.status !== "OK" || !data.results[0]) {
    throw new GeocodeError(
      address,
      `Geocoding returned status "${data.status}" for address "${address}"`,
    );
  }

  const { lat, lng } = data.results[0].geometry.location;
  return { lat, lng };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/lib/services/geocode.test.ts
```

Expected: PASS (5/5).

- [ ] **Step 5: Commit**

```bash
git add lib/services/geocode.ts tests/lib/services/geocode.test.ts
git commit -m "feat: geocodeAddress service with GeocodeError"
```

---

## Task 3: `lib/services/directions.ts` + unit tests

**Goal:** Pure service that accepts an origin, destination, and ordered waypoints (all as `{ lat, lng }`), calls the Google Directions API, and returns the encoded overview polyline string. Throws a typed `DirectionsError` on failure.

**Files:**
- Create: `lib/services/directions.ts`
- Create: `tests/lib/services/directions.test.ts`

- [ ] **Step 1: Write the failing tests**

`tests/lib/services/directions.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { getDirectionsPolyline, DirectionsError } from "@/lib/services/directions";

const ENCODED = "gxztEfauiS_fake_polyline_";

const OK_RESPONSE = {
  status: "OK",
  routes: [{ overview_polyline: { points: ENCODED } }],
};

function makeResponse(body: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

const ORIGIN = { lat: 35.0844, lng: -106.6504 };
const DEST   = { lat: 35.687,  lng: -105.9378 };
const WP     = { lat: 35.3003, lng: -106.5531 };

beforeEach(() => {
  mockFetch.mockReset();
  process.env.GOOGLE_MAPS_SERVER_KEY = "test-server-key";
});

describe("getDirectionsPolyline", () => {
  it("returns the overview_polyline.points string", async () => {
    mockFetch.mockReturnValue(makeResponse(OK_RESPONSE));
    const poly = await getDirectionsPolyline(ORIGIN, DEST, []);
    expect(poly).toBe(ENCODED);
  });

  it("includes origin, destination, and waypoints in the URL", async () => {
    mockFetch.mockReturnValue(makeResponse(OK_RESPONSE));
    await getDirectionsPolyline(ORIGIN, DEST, [WP]);
    const url: string = mockFetch.mock.calls[0][0];
    expect(url).toContain("maps.googleapis.com/maps/api/directions");
    expect(url).toContain("origin=");
    expect(url).toContain("destination=");
    expect(url).toContain("waypoints=");
  });

  it("works with zero waypoints", async () => {
    mockFetch.mockReturnValue(makeResponse(OK_RESPONSE));
    await expect(getDirectionsPolyline(ORIGIN, DEST, [])).resolves.toBe(ENCODED);
  });

  it("throws DirectionsError when status is NOT_FOUND", async () => {
    mockFetch.mockReturnValue(makeResponse({ status: "NOT_FOUND", routes: [] }));
    await expect(getDirectionsPolyline(ORIGIN, DEST, [])).rejects.toBeInstanceOf(DirectionsError);
  });

  it("throws DirectionsError when fetch is not ok", async () => {
    mockFetch.mockReturnValue(makeResponse({}, false, 500));
    await expect(getDirectionsPolyline(ORIGIN, DEST, [])).rejects.toBeInstanceOf(DirectionsError);
  });

  it("throws DirectionsError when routes array is empty", async () => {
    mockFetch.mockReturnValue(makeResponse({ status: "OK", routes: [] }));
    await expect(getDirectionsPolyline(ORIGIN, DEST, [])).rejects.toBeInstanceOf(DirectionsError);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/lib/services/directions.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/services/directions'`.

- [ ] **Step 3: Implement `lib/services/directions.ts`**

```ts
export class DirectionsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DirectionsError";
  }
}

export type LatLng = { lat: number; lng: number };

function latLngStr(p: LatLng): string {
  return `${p.lat},${p.lng}`;
}

/**
 * Calls Google Directions API and returns the encoded overview polyline.
 * Waypoints are treated as ordered intermediate stops (not optimized).
 */
export async function getDirectionsPolyline(
  origin: LatLng,
  destination: LatLng,
  waypoints: LatLng[],
): Promise<string> {
  const apiKey =
    process.env.GOOGLE_MAPS_SERVER_KEY ??
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ??
    "";

  const params = new URLSearchParams({
    origin: latLngStr(origin),
    destination: latLngStr(destination),
    key: apiKey,
  });

  if (waypoints.length > 0) {
    // Prefix with "via:" for intermediate stops that appear on the polyline
    // but are not optimized. Use plain lat/lng (no "via:") for stops the
    // driver must actually visit.
    params.set("waypoints", waypoints.map((w) => latLngStr(w)).join("|"));
  }

  const url = `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`;

  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new DirectionsError(`Network error fetching directions: ${String(err)}`);
  }

  if (!res.ok) {
    throw new DirectionsError(`Directions request failed (HTTP ${res.status})`);
  }

  const data = (await res.json()) as {
    status: string;
    routes: Array<{ overview_polyline: { points: string } }>;
  };

  if (data.status !== "OK" || !data.routes[0]) {
    throw new DirectionsError(`Directions API returned status "${data.status}"`);
  }

  return data.routes[0].overview_polyline.points;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/lib/services/directions.test.ts
```

Expected: PASS (6/6).

- [ ] **Step 5: Commit**

```bash
git add lib/services/directions.ts tests/lib/services/directions.test.ts
git commit -m "feat: getDirectionsPolyline service with DirectionsError"
```

---

## Task 4: Vitest setup — Google API network mocks

**Goal:** Add `fetch` interceptors to `tests/vitest.setup.ts` so any test that imports a Google-facing module and does not install its own `vi.stubGlobal("fetch", ...)` mock will hit a safe stub that returns a minimal valid response rather than the real network. This prevents accidental Google quota usage in CI and makes integration tests deterministic.

**Files:**
- Modify: `tests/vitest.setup.ts`

- [ ] **Step 1: Extend the setup file**

Append the following block to `tests/vitest.setup.ts` after the existing Twilio mock:

```ts
import { vi } from "vitest";

// ---------------------------------------------------------------------------
// Google Maps API network guard
// ---------------------------------------------------------------------------
// Intercept any fetch call to maps.googleapis.com and return a minimal valid
// response. Individual test files that need specific payloads should install
// their own vi.stubGlobal("fetch", mockFn) BEFORE importing the module under
// test — that override takes precedence.
//
// This guard prevents accidents when new service modules are tested without
// an explicit fetch mock.
// ---------------------------------------------------------------------------
const _realFetch = globalThis.fetch;

vi.stubGlobal(
  "fetch",
  vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

    if (typeof url === "string" && url.includes("maps.googleapis.com")) {
      // Determine which API is being called and return a minimal valid stub.
      if (url.includes("/geocode/")) {
        return new Response(
          JSON.stringify({
            status: "OK",
            results: [{ geometry: { location: { lat: 35.0844, lng: -106.6504 } } }],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (url.includes("/directions/")) {
        return new Response(
          JSON.stringify({
            status: "OK",
            routes: [{ overview_polyline: { points: "mock_polyline_stub" } }],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      // Unknown Google endpoint — fail loudly so tests don't silently pass.
      throw new Error(
        `[vitest.setup] Unmocked Google Maps fetch intercepted: ${url.slice(0, 120)}`,
      );
    }

    // All non-Google fetches pass through to the real implementation.
    return _realFetch(input, init);
  }),
);
```

- [ ] **Step 2: Run full test suite to confirm no regression**

```bash
npx vitest run
```

Expected: all previously-passing tests still pass. The new global mock does not break Supabase client calls (they use the supabase-js HTTP client, not raw `fetch` with a googleapis.com hostname).

- [ ] **Step 3: Commit**

```bash
git add tests/vitest.setup.ts
git commit -m "test: add Google Maps API fetch guard to vitest setup"
```

---

## Task 5: POST handler — accept addresses + stops; geocode + directions

**Goal:** Rewrite `POST /api/routes` to accept `start_address`, `end_address`, `stops: [{ address, name? }]` instead of lat/lng. Geocode each address (reject with 422 on any failure), call Directions, store the polyline, insert `route_stops` rows.

**Files:**
- Modify: `app/api/routes/route.ts`
- Create: `tests/api/routes/create-address.test.ts`
- Modify: `tests/api/routes/create.test.ts` (update to new address-based body)

> **Intermediate broken state:** After this task `tests/api/routes/create.test.ts` must also be updated — it sends `start_lat`/`start_lng`/`end_lat`/`end_lng` which the handler no longer accepts. The old fields are dropped from validation; sending them is ignored (extra fields in body). However, removing `route_polyline` from the required fields breaks the existing test's `route_polyline: "test_polyline"` expectation. The test is updated in Step 1 below alongside the new test file.

- [ ] **Step 1: Write the failing tests**

`tests/api/routes/create-address.test.ts`:

```ts
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
    expect(json.stops).toHaveLength(0);
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
    expect(json.stops).toHaveLength(1);
    expect(json.stops[0].order_index).toBe(0);
    expect(json.stops[0].name).toBe("Bernalillo");
    expect(typeof json.stops[0].latitude).toBe("number");
  });

  it("rejects with 422 when start_address geocode fails", async () => {
    // The global fetch mock in vitest.setup.ts returns OK by default.
    // Override fetch for this test to simulate geocode failure for a specific address.
    // We rely on the handler calling geocode for start_address first.
    const { vi } = await import("vitest");
    const spy = vi.spyOn(globalThis, "fetch").mockImplementationOnce(async () =>
      new Response(JSON.stringify({ status: "ZERO_RESULTS", results: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
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
    spy.mockRestore();
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.field).toBe("start_address");
    expect(typeof json.message).toBe("string");
  });

  it("rejects with 422 when a stop address geocode fails, identifying the index", async () => {
    const { vi } = await import("vitest");
    // First two fetches (start + end geocode) succeed; third (stop 0) fails.
    let callCount = 0;
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      callCount += 1;
      if (callCount === 3) {
        return new Response(JSON.stringify({ status: "ZERO_RESULTS", results: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({ status: "OK", results: [{ geometry: { location: { lat: 35.08, lng: -106.65 } } }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });
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
    spy.mockRestore();
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.field).toBe("stops[0].address");
  });

  it("rejects missing required fields with 400", async () => {
    const res = await callPost({ hub_id: hub.id, title: "incomplete" });
    expect(res.status).toBe(400);
  });
});
```

Also update `tests/api/routes/create.test.ts` — replace the `callPost` body in "creates route and sends admin SMS confirmation" to use address fields:

```ts
// In create.test.ts — update the happy-path body:
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
// Remove the route_polyline, start_lat, start_lng, end_lat, end_lng fields.
// The "rejects invalid payload" and "rejects missing driver_id" cases remain
// valid as-is (they already omit address fields → hit 400 missing-required check).
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/api/routes/create-address.test.ts
```

Expected: FAIL — handler still expects raw lat/lng.

- [ ] **Step 3: Rewrite `app/api/routes/route.ts` POST handler**

Key changes to the POST export:
- Required body fields: `hub_id`, `driver_id`, `title`, `start_address`, `end_address`, `start_time`, `end_time`. `stops` defaults to `[]` if absent.
- Remove `route_polyline`, `start_lat`, `start_lng`, `end_lat`, `end_lng` from request body parsing.
- Geocode sequence: `geocodeAddress(start_address)` → `geocodeAddress(end_address)` → `geocodeAddress(stops[i].address)` for each stop in order. On `GeocodeError`, return `NextResponse.json({ field: "start_address" | "end_address" | "stops[i].address", message: err.message }, { status: 422 })`.
- Call `getDirectionsPolyline(startLatLng, endLatLng, stopLatLngs)` — on `DirectionsError`, return 422 `{ field: "route", message }`.
- Insert into `routes` with all geocoded lat/lng fields plus `start_address`, `end_address`, and `route_polyline` from Directions.
- Insert `route_stops` rows in a single batch insert.
- Re-select with `*, hubs(...), route_stops(*)` ordered by `order_index` and return in `stops` key of response.
- GET handler must also join `route_stops` (handled in Task 7).

The import block adds:
```ts
import { geocodeAddress, GeocodeError } from "@/lib/services/geocode";
import { getDirectionsPolyline, DirectionsError } from "@/lib/services/directions";
```

- [ ] **Step 4: Run new tests and updated old tests**

```bash
npx vitest run tests/api/routes/create-address.test.ts tests/api/routes/create.test.ts
```

Expected: PASS (all tests in both files green).

- [ ] **Step 5: Run full suite**

```bash
npx vitest run
```

Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add app/api/routes/route.ts tests/api/routes/create-address.test.ts tests/api/routes/create.test.ts
git commit -m "feat(api): POST /api/routes accepts addresses + stops; server geocodes"
```

---

## Task 6: PATCH handler — accept addresses + stops; re-geocode on change

**Goal:** Extend `PATCH /api/routes/[id]` to accept `start_address`, `end_address`, `stops` (full replacement). If any address field is present in the body, re-geocode it. If `stops` is present, delete existing `route_stops` and insert the new set. If any address changed (start, end, or any stop), re-run Directions and update `route_polyline`. Re-broadcast follows existing logic.

**Files:**
- Modify: `app/api/routes/[id]/route.ts`
- Create: `tests/api/routes/[id]/patch-address.test.ts`
- Modify: `tests/api/routes/[id]/patch.test.ts` (update cases that set lat/lng directly)

> **Intermediate broken state:** `tests/api/routes/[id]/patch.test.ts` currently sends `start_lat` etc. Those fields become ignored by the handler (they no longer appear in `MutableFields`). Tests that assert `route.start_lat` changes via body patch need to be migrated to `start_address`. Step 1 updates those cases.

- [ ] **Step 1: Write the new test file and update the existing one**

`tests/api/routes/[id]/patch-address.test.ts` — mirror the structure of `patch.test.ts`, with helpers `insertRoute` inserting routes using address fields (post-Task-5 schema). Key test cases:

```
describe("PATCH /api/routes/:id — address-based") {
  "updates start_address only: re-geocodes, updates start_lat/lng, re-runs directions, stores new polyline"
  "updates stops (full replacement): deletes old stops, inserts new ones in order"
  "reorder stops produces different polyline (assert polyline changes between two PATCH calls)"
  "geocode failure on stop[1].address returns 422 with field=stops[1].address, no partial update"
  "editing a published route with new stop triggers rebroadcast"
  "missing stops key → stops unchanged (title-only PATCH is safe)"
  "returns 404 for nonexistent route"
}
```

Update `tests/api/routes/[id]/patch.test.ts`:
- The case "updates driver_id — upserts route_assignments": no change needed (driver_id handling is unchanged).
- The case "editing a published route triggers rebroadcast": update `insertRoute` helper to use `start_address`/`end_address` fields.
- Remove any test case that directly patched `start_lat`/`end_lat` as raw numbers (those fields are gone from `MutableFields`).

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/api/routes/[id]/patch-address.test.ts
```

Expected: FAIL — handler does not yet accept address fields.

- [ ] **Step 3: Rewrite the PATCH handler**

Key changes to `app/api/routes/[id]/route.ts`:

Remove `start_lat`, `start_lng`, `end_lat`, `end_lng`, `route_polyline` from the user-mutable `MutableFields` type (they are now derived, never user-supplied directly).

Add to `MutableFields`:
```ts
start_address?: string;
end_address?: string;
// lat/lng remain in MutableFields for internal use after geocoding
start_lat?: number;
start_lng?: number;
end_lat?: number;
end_lng?: number;
route_polyline?: string;
```

Body parsing logic:
1. Parse `start_address`, `end_address` as optional strings. If present, geocode each. On `GeocodeError`, return 422 `{ field: "start_address"|"end_address", message }`.
2. Parse `stops?: Array<{ address: string; name?: string | null }>`. If present, geocode each `stops[i].address`. On `GeocodeError`, return 422 `{ field: "stops[i].address", message }`.
3. If any address was geocoded (start, end, or stops changed), call `getDirectionsPolyline`. On `DirectionsError`, return 422 `{ field: "route", message }`.
4. Fetch existing route to resolve current lat/lng for any address not provided in the patch (needed to call Directions even if only one end changed).
5. Update `routes` row, then:
   - If `stops` was provided: `DELETE FROM route_stops WHERE route_id = id`, then batch-insert new stops.
6. Re-select with `route_stops` joined, then trigger rebroadcast if published.

- [ ] **Step 4: Run all route tests**

```bash
npx vitest run tests/api/routes/
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add app/api/routes/[id]/route.ts tests/api/routes/[id]/patch-address.test.ts tests/api/routes/[id]/patch.test.ts
git commit -m "feat(api): PATCH /api/routes/[id] accepts addresses + stops; re-geocodes on change"
```

---

## Task 7: GET — join `route_stops`; update `RouteRow` type

**Goal:** The GET list and GET detail (via PATCH re-select) responses both include `stops: RouteStop[]`. Update `lib/api/client.ts` with the new type. The shell and list components will receive stops transparently.

**Files:**
- Modify: `app/api/routes/route.ts` (GET handler)
- Modify: `lib/api/client.ts`

- [ ] **Step 1: Update the GET handler in `app/api/routes/route.ts`**

Change the `select` call from:
```ts
.select("*, hubs ( id, name, phone, email )")
```
to:
```ts
.select("*, hubs ( id, name, phone, email ), route_stops ( id, order_index, address, name, latitude, longitude )")
```

Add `.order("order_index", { foreignTable: "route_stops", ascending: true })` to the query so stops are always returned in order.

- [ ] **Step 2: Update `lib/api/client.ts`**

Add `RouteStop` type:
```ts
export type RouteStop = {
  id: string;
  order_index: number;
  address: string;
  name: string | null;
  latitude: number;
  longitude: number;
};
```

Update `RouteRow`:
```ts
export type RouteRow = {
  id: string;
  hub_id: string;
  title: string;
  start_address: string;
  end_address: string;
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
  stops: RouteStop[];
};
```

Update `RouteUpdatePayload`:
```ts
export type RouteStop_Input = { address: string; name?: string | null };

export type RouteUpdatePayload = Partial<{
  title: string;
  driver_id: string;
  start_address: string;
  end_address: string;
  stops: RouteStop_Input[];
  start_time: string;
  end_time: string;
  notes: string | null;
}>;
```

Add `RouteCreatePayload`:
```ts
export type RouteCreatePayload = {
  hub_id: string;
  driver_id: string;
  title: string;
  start_address: string;
  end_address: string;
  stops: RouteStop_Input[];
  start_time: string;
  end_time: string;
  notes?: string | null;
};
```

Update `api.createRoute` signature to accept `RouteCreatePayload` instead of `Record<string, unknown>`.

- [ ] **Step 3: Fix TypeScript errors**

Run `npx tsc --noEmit` and fix any type errors caused by the `RouteRow` changes (the `RouteEditor`'s `stateFromRoute` will gain access to `start_address`/`end_address`/`stops` for the first time — no breakage expected yet since the editor still reads lat/lng; those will be removed in Task 8).

- [ ] **Step 4: Run full suite**

```bash
npx vitest run
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add app/api/routes/route.ts lib/api/client.ts
git commit -m "feat(api): GET /api/routes joins route_stops; update RouteRow type"
```

---

## Task 8: `RouteEditor` rewrite — address inputs + stops list

**Goal:** Replace the four lat/lng number inputs with `start_address` and `end_address` text inputs. Add a "Stops" section: a list of stop rows each with an address field, optional name field, and up/down reorder buttons plus a remove button. An "Add stop" button appends an empty row. Field-level errors from 422 responses are surfaced next to the offending field.

**Files:**
- Modify: `components/routes/route-editor.tsx`
- Modify: `components/routes/route-planner-shell.tsx` (update mutation payloads)

- [ ] **Step 1: Update `FormState` and stop management**

New `FormState`:
```ts
type StopInput = { address: string; name: string };

type FormState = {
  title: string;
  driver_id: string;
  start_time: string;
  end_time: string;
  start_address: string;
  end_address: string;
  stops: StopInput[];
  notes: string;
};
```

`stateFromRoute` reads `r.start_address`, `r.end_address`, `r.stops.map(s => ({ address: s.address, name: s.name ?? "" }))`.

`emptyState` returns `{ ..., start_address: "", end_address: "", stops: [], notes: "" }`.

Stop operations (pure state updates, no network):
- `addStop`: append `{ address: "", name: "" }` to `form.stops`.
- `removeStop(i)`: filter out index `i`.
- `moveStopUp(i)`: swap `stops[i]` and `stops[i-1]` when `i > 0`.
- `moveStopDown(i)`: swap `stops[i]` and `stops[i+1]` when `i < stops.length - 1`.

- [ ] **Step 2: Update the JSX**

Replace the `grid-cols-2` lat/lng block with:

```tsx
<label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-stone-600">
  Origin address
  <input className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-sm"
         value={form.start_address} onChange={set("start_address")}
         placeholder="123 Main St, City, State" />
  {fieldError?.field === "start_address" && (
    <span className="mt-1 block text-xs text-red-600">{fieldError.message}</span>
  )}
</label>

<label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-stone-600">
  Destination address
  <input className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-sm"
         value={form.end_address} onChange={set("end_address")}
         placeholder="456 Oak Ave, City, State" />
  {fieldError?.field === "end_address" && (
    <span className="mt-1 block text-xs text-red-600">{fieldError.message}</span>
  )}
</label>

{/* Stops section */}
<div className="mb-3">
  <div className="mb-1 flex items-center justify-between">
    <span className="text-xs font-semibold uppercase tracking-wide text-stone-600">Stops</span>
    <button type="button" onClick={addStop}
            className="rounded border border-stone-300 px-2 py-0.5 text-xs text-stone-700">
      + Add stop
    </button>
  </div>
  {form.stops.map((stop, i) => (
    <div key={i} className="mb-2 flex gap-1 items-start">
      <div className="flex flex-col gap-0.5">
        <button type="button" disabled={i === 0} onClick={() => moveStopUp(i)}
                className="rounded border px-1 text-xs disabled:opacity-30">↑</button>
        <button type="button" disabled={i === form.stops.length - 1} onClick={() => moveStopDown(i)}
                className="rounded border px-1 text-xs disabled:opacity-30">↓</button>
      </div>
      <div className="flex-1 space-y-1">
        <input className="w-full rounded border border-stone-300 px-2 py-1 text-sm"
               placeholder="Stop address"
               value={stop.address}
               onChange={(e) => updateStop(i, "address", e.target.value)} />
        <input className="w-full rounded border border-stone-300 px-2 py-1 text-sm"
               placeholder="Stop name (optional)"
               value={stop.name}
               onChange={(e) => updateStop(i, "name", e.target.value)} />
        {fieldError?.field === `stops[${i}].address` && (
          <span className="block text-xs text-red-600">{fieldError.message}</span>
        )}
      </div>
      <button type="button" onClick={() => removeStop(i)}
              className="mt-1 rounded border border-red-200 px-1.5 py-0.5 text-xs text-red-600">×</button>
    </div>
  ))}
</div>
```

- [ ] **Step 3: Update error handling for field-level 422**

Add `fieldError` state: `const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null)`.

In `route-planner-shell.tsx`, the `updateMut.onError` and `createMut.onError` handlers currently receive a plain `Error` whose `message` is the string from `{ error: string }`. For 422 field errors, the response body is `{ field, message }` — update `lib/api/client.ts`'s `http()` helper to attach `field` to the thrown error when present:

```ts
// In http() error branch:
const body = await res.json().catch(() => ({}));
const err = new Error((body as { error?: string; message?: string })?.error || (body as { message?: string })?.message || `Request failed (${res.status})`);
(err as Error & { field?: string }).field = (body as { field?: string }).field;
throw err;
```

Then in `route-planner-shell.tsx` `onError` callbacks, extract `.field` and pass a `fieldError` prop to `RouteEditor`. Add `fieldError?: { field: string; message: string } | null` to `RouteEditor`'s `Props`.

- [ ] **Step 4: Update submit payload**

In `RouteEditor.submit()`:
- `mode === "create"`: send `{ title, driver_id, start_address, end_address, stops: form.stops.map(s => ({ address: s.address, name: s.name || null })), start_time, end_time, notes }`.
- `mode === "update"`: send `RouteUpdatePayload` with `start_address`, `end_address`, `stops` (always send the full stops array since the editor owns the authoritative list).

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add components/routes/route-editor.tsx components/routes/route-planner-shell.tsx lib/api/client.ts
git commit -m "feat(ui): RouteEditor — address inputs + ordered stops list with reorder"
```

---

## Task 9: `RouteMap` — render numbered stop pins

**Goal:** For the selected route, render a numbered circular pin for each stop in `route.stops` at order `1..N`. The pin uses the route's color (from `routeColor`), has a white number label, and is visually distinct from the start (existing circle pin) and destination (existing "D" marker).

**Files:**
- Modify: `components/routes/route-map.tsx`

- [ ] **Step 1: Add stop pins to `SelectedOverlay`**

Inside `SelectedOverlay`, after the existing `Marker` for the destination, render stop markers:

```tsx
{route.stops.map((stop, i) => (
  <Marker
    key={stop.id}
    position={{ lat: stop.latitude, lng: stop.longitude }}
    label={{
      text: String(i + 1),
      color: "#ffffff",
      fontWeight: "bold",
      fontSize: "11px",
    }}
    icon={{
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: routeColor(route.id),
      fillOpacity: 0.9,
      strokeColor: "#ffffff",
      strokeWeight: 2,
      scale: 14,
    }}
    title={stop.name ?? stop.address}
  />
))}
```

Also update `AllPinsFit` and `SelectedOverlay`'s bounds calculation to include stop coordinates:

```ts
// In SelectedOverlay bounds construction:
for (const stop of route.stops) bounds.extend({ lat: stop.latitude, lng: stop.longitude });
```

- [ ] **Step 2: Handle missing stops gracefully**

`route.stops` is `RouteStop[]` — always an array after Task 7 (may be `[]` for routes with no stops). The `map()` over an empty array produces no output, so no special null guard is needed.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add components/routes/route-map.tsx
git commit -m "feat(ui): RouteMap — numbered stop pins for selected route"
```

---

## Task 10: Cleanup — remove dead lat/lng inputs; final smoke

**Goal:** Remove dead code, verify the full test suite is green, and document the open security gap.

**Files:**
- Modify: `lib/api/validation.ts` (remove `isLatitude`, `isLongitude` only if unused elsewhere — grep first)
- Modify: `app/api/routes/route.ts` (remove now-unused `isLatitude`, `isLongitude` imports)
- Modify: `app/api/routes/[id]/route.ts` (remove now-unused lat/lng imports)
- Modify: `README.md` or env documentation (add `GOOGLE_MAPS_SERVER_KEY` to env var table)

- [ ] **Step 1: Grep for remaining lat/lng input references**

```bash
grep -rn "start_lat\|end_lat\|isLatitude\|isLongitude" \
  components/ lib/api/ app/api/routes/
```

Expected: only appear in `publish-route.ts` (which still reads `route.start_lat` from DB for the proximity function) and in `database.types.ts`. No user-facing input parsing should reference these. Fix any stragglers.

- [ ] **Step 2: Note `GOOGLE_MAPS_SERVER_KEY` security gap**

Add a comment to `lib/services/geocode.ts` and `lib/services/directions.ts` header blocks (already written in Task 2/3). Also add `GOOGLE_MAPS_SERVER_KEY` to `.env.local.example` (or equivalent env documentation) with a note:

```
# Server-only Google Maps key (restricted to Geocoding + Directions APIs, no referrer restriction).
# If absent, falls back to NEXT_PUBLIC_GOOGLE_MAPS_API_KEY — NOT safe for production.
GOOGLE_MAPS_SERVER_KEY=
```

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: all green.

- [ ] **Step 4: Manual smoke — open `/routes` and create a route with two stops**

1. Navigate to `/routes?hub_id=1e53e9e8-11db-4012-9451-f996632cd250`.
2. Click "+ New route".
3. Fill origin: `400 Marquette Ave NW, Albuquerque, NM 87102`, destination: `63 Lincoln Ave, Santa Fe, NM 87501`.
4. Click "+ Add stop", enter `1 Bernalillo Town Center, Bernalillo, NM 87004`.
5. Save. Verify the map shows the polyline and a numbered stop pin labeled "1".
6. Edit the route, move the stop up (no-op at index 0) and down (no-op when only one stop).
7. Add a second stop; verify reorder buttons work.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "chore: cleanup dead lat/lng inputs; document GOOGLE_MAPS_SERVER_KEY gap"
```

---

## Open Questions

1. **`GOOGLE_MAPS_SERVER_KEY` timeline:** The current `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is browser-exposed. Creating a separate server key with Geocoding + Directions API enabled and restricting it to server IPs (or no referrer restriction) is an ops task outside this plan. The plan falls back safely but should be resolved before production.

2. **Directions API waypoint ordering:** The plan uses plain lat/lng waypoints (driver must visit them). If route optimization is ever needed, the `waypoints=optimize:true|...` prefix can be added to `getDirectionsPolyline` in a future PR without schema changes.

3. **`find_farmers_near_route_points` RPC and stop coordinates:** `lib/services/publish-route.ts` currently passes only `[start_lat, start_lng, end_lat, end_lng]` as route points. After this plan, stop lat/lng values are in `route_stops`. A follow-up should add stops to the `route_points` array passed to the RPC so farmers near mid-route stops are also notified. This plan does not block on that enhancement — proximity matching still works as before.

4. **Stops on the driver dashboard:** `find_routes_near_farmer` RPC and the farmer opportunity card don't surface stops yet. A separate PR should add stop data to those views.
```

---

Summary of key decisions and open questions:

The plan adopts a strict "server owns geocoding" model: lat/lng fields disappear entirely from the POST/PATCH request contract (they become derived, internal fields). The 422 rejection is whole-save — no partial geocode success — because allowing a half-geocoded route into the database would leave inconsistent lat/lng and polyline state. The stops replacement strategy for PATCH is full-array replacement (delete all, reinsert) rather than surgical diff, which avoids order_index collision edge cases at the cost of a round-trip delete; this is safe because stops have no external foreign keys. Task 5 carries an intentional breaking change to `tests/api/routes/create.test.ts` which is updated in the same task commit to avoid a red CI window. The Google Maps API key security gap is flagged but left out of scope — the fallback to `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` keeps the feature working while the separate `GOOGLE_MAPS_SERVER_KEY` env var is the correct long-term solution. One unanswered question from the repo: `lib/services/publish-route.ts` passes only start/end lat/lng to `find_farmers_near_route_points`; after stops land, farmers near mid-route stops will not receive SMS — this gap should be addressed in a follow-up but is not blocking.