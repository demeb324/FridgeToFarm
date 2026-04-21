# Frontend ↔ Backend Integration — Design

**Date:** 2026-04-21
**Status:** Draft, pending user review

## Goal

Replace all remaining `mock-data` imports in role pages with real backend data, fill the data-source gaps the current schema cannot satisfy, and fix existing wiring bugs surfaced by the audit. Ship an MVP that exercises the full farmer-notification loop end-to-end from the UI.

## Non-goals

- Real authentication. Identity is a query-param (`?hub=<uuid>`, `?farmer=<uuid>`, `?id=<uuid>` for driver) until auth is a separate project.
- RLS. All endpoints use `createAdminSupabaseClient` (service role), matching today's posture.
- Admin CRUD UIs. Hub and driver rows are seeded via migration; no admin screens yet.
- Navbar identity persistence — deferred. Users paste identity params when switching pages.

## Audit findings (starting state)

Five pages still import from `lib/mock-data.ts`: `/farmer`, `/driver`, `/hub` (via `hub-dashboard-shell`), `/routes`, and the landing page. `/respond` is already fully wired.

Existing bugs:

1. **Publish flow dead from the UI.** `GoogleRoutePlanner` calls `POST /api/routes` only. The `PATCH /api/routes/[id]/publish` endpoint — which runs proximity matching and SMS-broadcasts to farmers — is never invoked from any UI path. Admin SMS fires on creation; farmer SMS does not.
2. **Hardcoded `DEMO_HUB_ID`** in `google-route-planner.tsx` will 500 if the seed row is missing.
3. **Empty endpoint shells:** `app/api/routes/publish-new/` and `app/api/notify-demo/` are stub directories left over from prior iterations.
4. **Driver info stuffed into `routes.notes`** — no schema link between drivers and routes.

Missing data sources the current schema cannot satisfy:

- No `drivers` table → `/driver` has no backend.
- No hub aggregates → `/hub` dashboard counts cannot be queried.
- No "routes near farmer" query → `/farmer` opportunities cannot be computed.

## Architecture

**Rendering.** Role pages become client components (`"use client"`). They read identity from `useSearchParams()` and fetch data with TanStack Query (`@tanstack/react-query`). Pages render loading skeletons, error cards with retry, and empty states. Mutations use `useMutation` and invalidate relevant query keys on success. `/respond` stays a server component (it works and doesn't have the identity problem).

**API surface.** Traditional REST endpoints under `app/api/*`. No Server Actions, no tRPC. Integration tests continue to target HTTP, matching the current `tests/` pattern.

**Supabase access.** Endpoints use `createAdminSupabaseClient` today and continue to. No RLS migration path in scope.

**Client data layer.**

```
lib/api/client.ts         # typed fetch wrappers per endpoint
app/providers.tsx         # QueryClientProvider, wired in app/layout.tsx
```

**Module layout (delta from today):**

```
app/
  api/
    hubs/route.ts                          NEW (GET list)
    hubs/[id]/stats/route.ts               NEW
    drivers/route.ts                       NEW (GET list, optional ?hub_id filter)
    drivers/[id]/assignments/route.ts      NEW (GET)
    drivers/[id]/assignments/[assignmentId]/route.ts  NEW (PATCH status)
    farmers/[id]/opportunities/route.ts    NEW
    farmers/[id]/notifications/route.ts    NEW
    routes/publish-new/                    DELETE (empty)
    notify-demo/                           DELETE (empty)
lib/
  api/client.ts                            NEW
  config/scenarios.ts                      NEW (moved from mock-data.ts)
supabase/migrations/
  20260421XXXXXX_add_drivers_and_assignments.sql  NEW
```

## Schema additions

One new migration. Tables, proximity function, and seed rows in one file.

### `drivers`

```sql
CREATE TABLE drivers (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  hub_id     uuid NOT NULL REFERENCES hubs(id) ON DELETE RESTRICT,
  first_name text NOT NULL,
  last_name  text NOT NULL,
  phone      text NOT NULL UNIQUE,
  vehicle    text,
  zone       text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_drivers_hub_id ON drivers (hub_id);
```

### `route_assignments`

Join table (not a `routes.driver_id` column) so status lives on the assignment and future multi-driver routes don't need a re-migration.

```sql
CREATE TABLE route_assignments (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id   uuid NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  driver_id  uuid NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
  status     text NOT NULL DEFAULT 'assigned'
             CHECK (status IN ('assigned','started','in_progress','completed','cancelled')),
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (route_id, driver_id)
);
CREATE INDEX idx_route_assignments_driver_id ON route_assignments (driver_id);
CREATE INDEX idx_route_assignments_route_id  ON route_assignments (route_id);
```

### `find_routes_near_farmer(farmer_id uuid, radius_miles float8 DEFAULT 10)`

Mirror of existing `find_farmers_near_route_points`, route-centric. Returns published routes whose start or end point is within `radius_miles` of the farmer's location **and** for which the farmer has no existing `route_responses` row of any status (pending, confirmed, or cancelled — a cancelled response removes the opportunity from future lists by design).

### Seed rows (same migration file)

- 1 hub (Boise Distribution Hub) with a fixed UUID so tests and the planner can reference it.
- 2 drivers linked to that hub.
- No farmer seeds (created via `/api/farmers`; integration tests manage their own).
- No route seeds (created via planner UI).

## Endpoint contracts

All new endpoints follow the existing `{ error: string }` failure shape and reuse validation helpers in `lib/api/validation.ts`.

### NEW

**`GET /api/hubs`** → `[{ id, name, phone, email }]`

**`GET /api/hubs/[id]/stats`** → `{ nearbyGrowers, pickupRequests, activeTrips }`
- `nearbyGrowers`: distinct farmers within 10mi of any published route owned by this hub, via `find_farmers_near_route_points` over that hub's routes.
- `pickupRequests`: count of `route_responses` with status `pending` joined to this hub's routes.
- `activeTrips`: count of `route_assignments` with status in (`started`, `in_progress`) joined to this hub's routes.

**`GET /api/drivers?hub_id=<uuid>`** → `[{ id, firstName, lastName, phone, vehicle, zone, avatarUrl, hubId }]`
- `hub_id` filter optional; absent returns all drivers.

**`GET /api/drivers/[id]/assignments`** → `[{ id, routeId, routeTitle, pickupSource, destination, pickupWindow, material, notes, status }]`
- Joins `route_assignments` → `routes`; shaped to match the existing `DriverRouteAssignment` TypeScript type so the UI needs no rework.
- `material` is derived from `routes.notes` for MVP (no dedicated column).

**`PATCH /api/drivers/[id]/assignments/[assignmentId]`** → updated assignment
- Body: `{ status }`. Validated against the CHECK list.

**`GET /api/farmers/[id]/opportunities`** → `[{ routeId, hubName, routeDate, pickupWindow, destination, distanceMiles }]`
- Uses `find_routes_near_farmer`. Excludes any route the farmer has already responded to (any status).

**`GET /api/farmers/[id]/notifications`** → `[{ id, sender, timestamp, message }]`
- Reads `notification_log` joined to `routes` + `hubs`. Shaped to match the existing `FarmerNotification` type. Ordered by `created_at DESC`.

### CHANGED

**`POST /api/routes`** — accepts new required field `driver_id`. After inserting the route, insert a `route_assignments` row linking driver and route. Admin SMS behavior unchanged. Driver info no longer stuffed into `routes.notes` (planner cleanup).

### Deleted

- `app/api/routes/publish-new/` (empty dir)
- `app/api/notify-demo/` (empty dir)

## Per-page data flow

### `/routes`
- Page stays an RSC shell; `<GoogleRoutePlanner>` stays client.
- Planner uses `useQuery(['drivers', hubId])` to populate the driver dropdown. Replaces `drivers` mock import.
- `routeScenarios` moves to `lib/config/scenarios.ts`. Not mock — intentional UI presets.
- Hub ID from `useSearchParams()` (`?hub=<uuid>`), falling back to the single seeded hub.
- **Publish bug fix:** submit handler becomes two-step via `useMutation`:
  1. `POST /api/routes` with `driver_id`.
  2. On success → `PATCH /api/routes/[id]/publish` (runs proximity match + SMS broadcast).
  3. `queryClient.invalidateQueries(['routes'])`.
  UI surfaces the broadcast result ("N notified, M failed").

### `/farmer`
- Converts to `"use client"`. Reads `?id=<farmer_uuid>`.
- Three queries:
  - `['opportunities', farmerId]` → `GET /api/farmers/[id]/opportunities` (replaces `pickupOpportunities`)
  - `['notifications', farmerId]` → `GET /api/farmers/[id]/notifications` (replaces `farmerNotifications`)
- `<LoadCapacityEstimator>` unchanged.

### `/driver`
- Converts to `"use client"`. Reads `?id=<driver_uuid>`.
- `useQuery(['assignments', driverId])` → `GET /api/drivers/[id]/assignments`.
- Status-change buttons use `useMutation` → `PATCH /api/drivers/[id]/assignments/[assignmentId]` → invalidate `['assignments', driverId]`.

### `/hub`
- Converts to `"use client"`. Reads `?id=<hub_uuid>`.
- Two queries in parallel:
  - `['hubStats', hubId]` → `GET /api/hubs/[id]/stats`
  - `['routes', hubId]` → `GET /api/routes?hub_id=<uuid>`
- `<HubDashboardShell>` takes merged data as props; no longer imports mock.

### `/respond`
- Untouched.

### `app/page.tsx` (landing)
- `heroStats` moves to `lib/config/landing.ts`. Marketing copy, not data.

### Loading / error / empty states
- Every query-backed section renders a skeleton while `isLoading`.
- On `isError`, inline error card with retry button calling `refetch()`.
- Empty collections render a neutral "nothing here yet" card.

## Testing

Keep the existing integration test pattern (`tests/` hitting HTTP endpoints via `fetch`).

New integration tests, one per new behavior:

- `GET /api/hubs` returns seeded hub.
- `GET /api/hubs/[id]/stats` returns the three counts; seed data makes each non-zero.
- `GET /api/drivers?hub_id=` filters correctly.
- `GET /api/drivers/[id]/assignments` joins correctly.
- `PATCH /api/drivers/[id]/assignments/[assignmentId]` updates status and validates against the CHECK list.
- `GET /api/farmers/[id]/opportunities` excludes responded routes — verify with one responded and one non-responded route.
- `GET /api/farmers/[id]/notifications` returns log rows in descending order.
- **Publish regression test:** end-to-end sequence of `POST /api/routes` → `PATCH /api/routes/[id]/publish` asserting notification log rows are created.

Client-side React Query behavior is not unit tested; manual QA covers it.

## Implementation sequence

1. Migration file: tables + `find_routes_near_farmer` + seed rows.
2. Backend endpoints in dependency order: drivers list → drivers/assignments → hubs list → hub stats → farmer opportunities → farmer notifications → `POST /api/routes` change.
3. Integration tests alongside each endpoint as it lands.
4. Add `@tanstack/react-query`; create `app/providers.tsx` and wire into `app/layout.tsx`.
5. Create `lib/api/client.ts`.
6. Rewrite role pages in order: `/farmer` → `/driver` → `/hub` → `/routes`.
7. Fix the publish bug in the `/routes` planner (two-step mutation).
8. Delete dead mock entries, empty API directories, and move `routeScenarios` / `heroStats` to `lib/config/`.

## Flagged risks

- **Service-role everywhere.** Every endpoint uses the admin client. If auth + RLS ever lands, every endpoint becomes refactor debt.
- **`notification_log` is outbound-only.** Farmer "message feed" shows only hub→farmer SMS. If inbound messages become a feature, the table needs a `direction` column or a sibling inbound table.
- **Cancelled responses permanently hide a route.** Intentional for simplicity; revisit if users complain.
- **No Navbar identity persistence.** Demo UX requires pasting `?id=<uuid>` when switching role pages.
