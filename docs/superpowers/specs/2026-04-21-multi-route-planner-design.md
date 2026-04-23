# Multi-Route Planner — Design Spec

**Date:** 2026-04-21
**Branch strategy:** Stacked PR on top of `feat/frontend-backend-integration` (PR #3)
**Scope:** `/routes` page + supporting backend endpoints

---

## Goal

Turn `/routes` from a single-route creation tool into a management view for all of a hub's routes. The hub operator can list, select, view, edit, create, and delete routes, with SMS re-broadcast happening automatically when a published route is edited.

## Non-goals

- Mobile layout (desktop-only page today)
- Edit conflict / concurrency handling (single-user demo)
- Route cloning or template mechanics
- Coverage-area / geofence visualization
- Farmer-side UI changes (farmers still view `/farmer` and respond via SMS link)

## User flow

1. Hub operator opens `/routes`.
2. Left column lists all routes for `DEMO_HUB_ID`, sorted by `start_time` ascending. Each route has a deterministic color based on its ID.
3. Map shows a colored start-pin for every route. Nothing else drawn until selection.
4. Operator clicks a list item or a map pin. Map fits bounds to that route and draws the polyline + origin/pickup/destination markers. Right-side detail panel loads the editable form.
5. Operator edits any field and clicks **Save**.
   - If the route was unpublished, save is silent.
   - If the route was published, save triggers an automatic SMS re-broadcast via the existing `publishRoute` service. The panel surfaces notified/failed counts.
6. Operator clicks **Delete** to remove a route. Cascades via existing FKs.
7. Operator clicks `+ New route` at the top of the list. Right panel shows a blank editor. Save runs the existing two-step POST `/api/routes` → PATCH `/api/routes/[id]/publish` flow.

## Layout

Three columns, desktop-only (matches current `/routes` page):

| Column | Width | Contents |
|--------|-------|----------|
| Left   | ~260px | Route list: `+ New route` button, then one row per route (color chip, title, driver name, short start time like `Wed 9:00 AM`, published badge). Active row highlighted. |
| Center | flex | Map. Colored start-pin per route. Selected route draws polyline + markers. Fits bounds to selection, or to all pins if nothing selected. |
| Right  | ~380px | Detail panel. Three states: empty, view/edit, create. |

### Detail panel states

**Empty** (no selection, not creating): `"Select a route or create a new one."`

**View/edit** (existing route selected):
- Title (editable text)
- Driver (dropdown from `api.listDrivers({ hubId })`)
- Start time, end time (`datetime-local` inputs)
- Origin address, destination address (text)
- Pickups (list editor, same as today)
- Notes (textarea)
- Published badge (read-only)
- **Save** button — triggers PATCH, re-broadcasts SMS if published, surfaces result
- **Delete** button — triggers DELETE with confirmation

**Create** (create mode):
- Same form fields, all blank
- **Save** button — runs POST `/api/routes` then PATCH `/api/routes/[id]/publish` (existing two-step)
- No delete button

## Map behavior

- All routes render a single `Marker` at their `start_lat` / `start_lng`, colored via the route's deterministic hash-to-HSL.
- The **selected** route additionally renders its `Polyline` plus origin, pickup(s), and destination markers (current planner behavior).
- Clicking a non-selected pin selects that route (sets `selectedRouteId`, enters `view` mode).
- Clicking empty map area does not change selection (prevents accidental deselect).
- On `selectedRouteId` change, the map animates a bounds-fit to the selected route's coordinates. If `selectedRouteId === null`, it fits bounds to all pins.

## Backend changes

### New: `PATCH /api/routes/[id]`

**Purpose:** Update mutable fields of a route. If the route was published, re-broadcast SMS.

**Request body** (all optional; only provided fields updated):
```ts
{
  title?: string;
  driver_id?: string;       // updates route_assignments row
  start_lat?: number;
  start_lng?: number;
  end_lat?: number;
  end_lng?: number;
  route_polyline?: string;
  start_time?: string;      // ISO 8601
  end_time?: string;
  notes?: string | null;
}
```

**Response:**
```ts
{
  route: Route;
  rebroadcast?: {
    farmers_notified: number;
    notifications: Array<{ farmer_id: string; status: "sent" | "failed" }>;
  };
}
```

**Behavior:**
1. Validate route exists (404 if not).
2. Update the `routes` row with provided fields.
3. If `driver_id` provided, upsert the `route_assignments` row (update existing or insert if none).
4. If `routes.published = true` after the update, call the existing `publishRoute` service (the same one the publish endpoint uses) to re-run farmer proximity matching and SMS broadcast. Attach the result as `rebroadcast`.
5. Return the updated route.

**Error cases:**
- 404 if route not found.
- 400 on malformed body (Zod parse failure).
- 422 if `driver_id` provided but the driver does not exist (matches the validation pattern of the existing POST handler).

### New: `DELETE /api/routes/[id]`

**Purpose:** Remove a route.

**Behavior:**
1. Validate route exists (404 if not).
2. Delete the `routes` row. Existing FK cascades handle `route_assignments`, `route_responses`, `notification_log`.
3. Return `204 No Content`.

**Error cases:** 404 if route not found.

### Unchanged

- `POST /api/routes`
- `PATCH /api/routes/[id]/publish`
- `GET /api/hubs/[id]/stats`
- All farmer/driver endpoints

## Data flow

- `useQuery(["routes", DEMO_HUB_ID], () => api.listRoutes(DEMO_HUB_ID))` in the shell. Invalidated on successful create, update, and delete.
- Shell-owned state:
  - `selectedRouteId: string | null`
  - `mode: "view" | "create"` + `isDirty: boolean`
    - `view`: default when a route is selected. Form fields are present; save is disabled until `isDirty` flips to `true` (any field change).
    - `create`: entered by clicking `+ New route`. Clears `selectedRouteId`. Save is always enabled.
- Three `useMutation` hooks:
  - `createRouteMutation` → POST `/api/routes`, then PATCH `/api/routes/[id]/publish`, then invalidate.
  - `updateRouteMutation` → PATCH `/api/routes/[id]`, then invalidate.
  - `deleteRouteMutation` → DELETE `/api/routes/[id]`, then invalidate, then clear selection.

## Component decomposition

Delete `components/google-route-planner.tsx` (766 lines). Split into:

| File | Responsibility |
|------|----------------|
| `components/routes/route-planner-shell.tsx` | Three-column layout. Owns `selectedRouteId` and `mode`. Owns the three mutations. Passes callbacks down. |
| `components/routes/route-list.tsx` | Pure presentation. Props: `routes`, `selectedId`, `onSelect`, `onCreateNew`. Renders the list items and `+ New route` button. |
| `components/routes/route-map.tsx` | Renders `APIProvider` + `Map` + pins for all routes + polyline/markers for selected route. Props: `routes`, `selectedRoute`. |
| `components/routes/route-editor.tsx` | The detail panel. Props: `mode`, `route?`, `drivers`, `onSave`, `onDelete`, `mutationState`. Renders the right-side form and action buttons. |
| `lib/routes/route-color.ts` | `routeColor(routeId: string): string` — deterministic hash-to-HSL helper. Pure function, unit-testable. |

`app/routes/page.tsx` mounts `<RoutePlannerShell hubId={DEMO_HUB_ID} />` and nothing else.

## Seed migration

New migration: `supabase/migrations/<ts>_seed_demo_routes.sql`

- Inserts the routes currently defined in `lib/config/scenarios.ts` as rows in `routes` for `DEMO_HUB_ID`, each with stable UUIDs (e.g. `r0000001-...` through `r0000004-...`) and `ON CONFLICT (id) DO NOTHING`.
- Inserts matching `route_assignments` rows mapping each seeded route to `DEMO_DRIVER_ID` with `status = 'assigned'`, `ON CONFLICT (route_id, driver_id) DO NOTHING`.
- All seeded routes start unpublished (`published = false`) so the demo doesn't show spurious notification counts.

After the migration lands:
- Delete `lib/config/scenarios.ts`.
- Remove the scenarios prop from the planner (it no longer takes one).
- Remove the scenarios import from `app/routes/page.tsx`.

## Testing

### Backend (vitest integration, same pattern as existing tests)

- `tests/api/routes/[id]/patch.test.ts`:
  - Updates title + notes on an unpublished route → returns updated route, no `rebroadcast`.
  - Updates `driver_id` → upserts `route_assignments`.
  - Updates an already-published route → returns `rebroadcast` with notified count, `notification_log` has new entries.
  - 404 on nonexistent route.
  - 400 on malformed body.
- `tests/api/routes/[id]/delete.test.ts`:
  - Deletes a route → 204, row gone, associated assignments and notification_log rows gone.
  - 404 on nonexistent route.

### Frontend

No new automated tests (project convention is integration-only for routes). Manual UI smoke covers:
- Create a route, see it appear in the list, see its pin on the map.
- Select it, edit the title, save, see the list item update.
- Publish an unpublished route, verify SMS dry-run path via vi.mock.
- Edit a published route, verify `rebroadcast` result surfaces in the detail panel.
- Delete a route, verify it disappears from list and map.

## Open risks

- **Re-broadcast cost at scale**: not a concern for demo, but any published route edit triggers a full SMS sweep. In production this would need throttling or an explicit re-notify button.
- **Seed UUID collisions**: if the demo DB already has routes at those UUIDs from earlier manual testing, the ON CONFLICT DO NOTHING silently skips. Acceptable.
- **Two mutations in sequence for create**: POST then publish. Failure between them leaves an unpublished route in the DB. Current behavior, unchanged.
