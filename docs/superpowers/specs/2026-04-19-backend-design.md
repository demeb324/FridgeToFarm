# FridgeToFarm Backend Design

Date: 2026-04-19
Status: Revised (merged main, adapted to existing implementation)
PRD: `docs/prd-mvp.md`

## Current State (from main branch)

The following backend infrastructure already exists on the `main` branch, built by another team member:

- **Database schema** — Live in Supabase with all 5 tables (farmers, hubs, routes, notification_log, route_responses), FKs, and indexes
- **Supabase SDK** — `@supabase/supabase-js` with browser client, server client, and admin client (service role key)
- **Auto-generated DB types** — `lib/supabase/database.types.ts` (246 lines, generated from Supabase schema)
- **Postgres functions** — `find_farmers_near_route_points(json, radius_miles)` and `haversine_miles(lat1, lng1, lat2, lng2)` for proximity matching
- **API routes** — All 4 endpoints exist: `POST /api/farmers`, `POST/GET /api/routes`, `PATCH /api/routes/:id/publish` (stub), `POST /api/responses`
- **Validation library** — `lib/api/validation.ts` with type-safe input parsing
- **Env helpers** — `lib/env.ts` for Supabase URL, anon key, service role key
- **Driver + Fertilizer pages** — New frontend pages with updated components

**What's still missing (this spec fills these gaps):**
1. Geocoding service (farmer registration requires lat/lng but no geocoding fallback)
2. SMS service (Twilio — publish endpoint is a stub, no notifications sent)
3. Proximity matching wired into publish endpoint (Postgres function exists but isn't called)
4. Respond page (`/respond?route=uuid&farmer=uuid` for farmers to submit responses)
5. Flat project structure (still in `frontend/` directory)
6. Environment variables for Google Maps and Twilio

## Summary

Extend the existing backend built with Supabase SDK by adding geocoding, SMS, proximity matching in the publish flow, and the farmer respond page. Flatten project structure to root level.

## Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| DB access | Supabase SDK (`@supabase/supabase-js`) — already in use on main | Consistent with existing code, don't fight the codebase |
| Migrations | Supabase dashboard — schema already live | DB already exists with all tables, FKs, indexes, and Postgres functions |
| Route path storage | `route_polyline` (text) — existing column on routes table | Matches existing DB schema; Postgres `find_farmers_near_route_points` function accepts decoded JSON separately |
| Proximity matching | Postgres function `find_farmers_near_route_points` — already in DB | Server-side matching, no need for TypeScript Haversine |
| Geocoding | Backend-side via Google Geocoding API (new) | API key stays secret (server env var) |
| SMS | Real Twilio integration (trial mode) (new) | End-to-end testing from the start |
| Project structure | Flat layout — all code and config at repo root (pending refactor) | Standard Next.js layout, no nested directories |
| Package management | Root-level `package.json` (all deps at top level) (pending refactor) | Single install, single tsconfig, zero path friction |
| Error handling | Minimal — only critical edge cases | Prototype mode, let non-critical failures be visible |
| Pattern | Service layer modules in `backend/` | Focused modules per domain, thin API routes |

## Project Structure

Flat layout — all config and source code at repo root. The `frontend/` directory from the initial scaffold has been eliminated. `backend/` holds server-side services and DB logic. Everything else (Next.js app, components, lib) lives at root.

```
FridgeToFarm/
  package.json                # All npm dependencies (next, react, kysely, pg, twilio, etc.)
  package-lock.json
  tsconfig.json               # Paths: @/* → ./*, @backend/* → ./backend/*
  next.config.ts              # Next.js config
  postcss.config.mjs
  eslint.config.mjs
  .gitignore
  .env.local                  # Environment variables (not committed)
  app/                        # Next.js App Router pages + API routes
    api/
      farmers/route.ts        # POST → farmer-service.registerFarmer()
      routes/route.ts         # GET + POST → route-service
      routes/[id]/
        publish/route.ts      # PATCH → publish-service.publishRoute()
      responses/route.ts      # POST → route-response creation
    respond/page.tsx          # GET — farmer response form (pre-filled)
    routes/page.tsx           # Hub route planner page
    hub/page.tsx              # Hub dashboard
    farmer/page.tsx           # Farmer registration
    auth/                     # Auth pages (placeholder)
    layout.tsx
    page.tsx                  # Home page
    globals.css
    loading.tsx
    favicon.ico
  components/                 # React components
    google-route-planner.tsx
    route-form.tsx
    route-card.tsx
    navbar.tsx
    ...etc
  lib/                        # Frontend utilities
    types.ts
    mock-data.ts
  public/                     # Static assets
  backend/                    # Backend services + DB (imported via @backend/* alias)
    db/
      client.ts               # Kysely instance, reads DATABASE_URL from env
      types.ts                # Kysely Database interface (table → type mappings)
    services/
      farmer-service.ts       # registerFarmer(), upsert on phone
      route-service.ts        # createRoute(), listRoutes(hubId)
      publish-service.ts      # publishRoute(routeId) → proximity match + SMS
      geocoding.ts            # geocodeAddress(address) → { lat, lng }
      sms.ts                  # sendSms(to, message) → { sid, status }
    lib/
      proximity.ts            # haversineDistance(), findFarmersNearRoute()
  migrations/
    001_initial_schema.ts     # Farmers, Hubs, Routes, NotificationLog, RouteResponses
    002_seed_hub.ts           # Pre-seed demo hub ("Roadrunner Food Bank")
  docs/
    prd-mvp.md
    superpowers/
      specs/
        2026-04-19-backend-design.md  # This file
```

## Database Schema

### Kysely Types (`backend/db/types.ts`)

```typescript
import type { Generated } from "kysely"

export interface Database {
  farmers: FarmersTable
  hubs: HubsTable
  routes: RoutesTable
  notification_log: NotificationLogTable
  route_responses: RouteResponsesTable
}

export interface FarmersTable {
  id: Generated<string>
  name: string
  phone: string                 // E.164 format, unique
  latitude: number
  longitude: number
  address_text: string
  opted_out: Generated<boolean>
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export interface HubsTable {
  id: Generated<string>
  name: string
  phone: string
  email: string
  created_at: Generated<Date>
}

export interface RoutesTable {
  id: Generated<string>
  hub_id: string                // FK → hubs.id
  title: string
  start_lat: number
  start_lng: number
  end_lat: number
  end_lng: number
  route_points: RoutePoint[]    // JSONB — decoded polyline points
  start_time: Date
  end_time: Date
  notes: string | null
  published: Generated<boolean>
  created_at: Generated<Date>
}

export interface NotificationLogTable {
  id: Generated<string>
  route_id: string
  farmer_id: string
  status: string                // "sent" | "failed" | "opted_out"
  twilio_sid: string | null
  error_message: string | null
  created_at: Generated<Date>
}

export interface RouteResponsesTable {
  id: Generated<string>
  route_id: string
  farmer_id: string
  response_type: string         // "crop_pickup" | "compost_pickup" | "both"
  notes: string | null
  status: string                // "pending" | "confirmed" | "cancelled"
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export interface RoutePoint {
  lat: number
  lng: number
}
```

### Indexes

- `farmers(latitude, longitude)` — composite index for proximity queries
- `routes(hub_id)` — list routes by hub
- `notification_log(route_id)` — notification status per route
- `route_responses(route_id, farmer_id)` — response lookup

### Schema Change from PRD

The PRD specifies `route_polyline` (text) for the encoded Google Maps polyline. This design replaces it with `route_points` (JSONB) storing the decoded `Array<{lat, lng}>`. The frontend decodes the polyline client-side and sends the decoded points. This eliminates the need for any polyline encoding/decoding library on the server.

## Dependencies

Root `package.json` includes:

- `kysely` — type-safe SQL query builder
- `pg` — PostgreSQL driver
- `twilio` — Twilio SDK for SMS
- `next` — Next.js framework
- `react`, `react-dom` — React
- `@vis.gl/react-google-maps` — Google Maps React component
- `tailwindcss` — styling

No Supabase client SDK — direct Postgres via Kysely.

## Environment Variables

```
DATABASE_URL=postgresql://user:pass@host:5432/db    # Supabase Postgres connection string
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
GOOGLE_MAPS_API_KEY=AI...                           # Used for geocoding (server-side)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AI...               # Used for maps (client-side)
BASE_URL=http://localhost:3000                       # For response URL generation in SMS
```

## API Endpoints

### `POST /api/farmers` — Register or update a farmer

**Request:**
```json
{
  "name": "string",
  "phone": "string (E.164)",
  "address_text": "string",
  "latitude": "number (optional, from browser GPS)",
  "longitude": "number (optional, from browser GPS)"
}
```

**Response 200:**
```json
{
  "id": "uuid",
  "name": "string",
  "phone": "string",
  "latitude": "number",
  "longitude": "number",
  "address_text": "string"
}
```

**Logic:**
1. If `latitude`/`longitude` not provided → call Google Geocoding API with `address_text`
2. Upsert farmer on `phone` (update name/location if exists, insert otherwise)
3. Return the farmer record

### `POST /api/routes` — Create a new route

**Request:**
```json
{
  "hub_id": "uuid",
  "title": "string",
  "start_lat": "number",
  "start_lng": "number",
  "end_lat": "number",
  "end_lng": "number",
  "route_points": "Array<{ lat: number, lng: number }>",
  "start_time": "ISO 8601 string",
  "end_time": "ISO 8601 string",
  "notes": "string (optional)"
}
```

**Response 201:**
```json
{
  "id": "uuid",
  "title": "string",
  "published": false,
  "created_at": "ISO 8601 string"
}
```

### `PATCH /api/routes/:id/publish` — Publish a route

**Request:** No body required.

**Response 200:**
```json
{
  "route_id": "uuid",
  "published": true,
  "farmers_notified": "number",
  "notifications": [
    {
      "farmer_id": "uuid",
      "farmer_name": "string",
      "status": "sent | failed | opted_out"
    }
  ]
}
```

**Logic:**
1. Load route from DB (return 404 if not found, 409 if already published)
2. Load all non-opted-out farmers from DB
3. Run proximity matching (`findFarmersNearRoute`) against `route_points` with 10-mile radius
4. For each matched farmer:
   - Format SMS: `[Hub Name] has a delivery route near you on [Date]. Tap to respond: [URL]. Questions? Contact [phone/email].`
   - Response URL: `{BASE_URL}/respond?route={route_id}&farmer={farmer_id}`
   - Call Twilio SMS — catch errors per-farmer, log to `notification_log`
5. Update route `published = true`
6. Return summary

### `GET /api/routes?hub_id=uuid` — List routes for a hub

**Response 200:**
```json
{
  "routes": [
    {
      "id": "uuid",
      "title": "string",
      "start_time": "ISO 8601",
      "end_time": "ISO 8601",
      "published": "boolean",
      "notes": "string | null",
      "created_at": "ISO 8601"
    }
  ]
}
```

### `POST /api/responses` — Submit a route response

**Request:**
```json
{
  "route_id": "uuid",
  "farmer_id": "uuid",
  "response_type": "crop_pickup | compost_pickup | both",
  "notes": "string (optional)"
}
```

**Response 201:**
```json
{
  "id": "uuid",
  "status": "pending",
  "created_at": "ISO 8601"
}
```

### `GET /respond?route=uuid&farmer=uuid` — Farmer response form page

Server-rendered Next.js page. Reads `route_id` and `farmer_id` from query params, fetches route details + farmer info + hub contact info server-side, and renders a pre-filled response form. No API endpoint — this is a page.

## Core Services

### Proximity Matching (`backend/lib/proximity.ts`)

Pure functions with no external dependencies.

- `haversineDistance(p1, p2): number` — Distance in miles between two lat/lng points using the Haversine formula
- `isFarmerNearRoute(farmer, routePoints, radiusMiles?): boolean` — Check if a farmer is within `radiusMiles` (default 10) of any point along the route path
- `findFarmersNearRoute(farmers, routePoints, radiusMiles?): Array<MatchedFarmer>` — Filter farmers to those within range, includes closest distance for debugging

Performance: O(farmers × route_points). At MVP scale (< 1000 farmers, < 500 points), runs in < 100ms.

### Geocoding Service (`backend/services/geocoding.ts`)

- `geocodeAddress(address: string): Promise<{ lat, lng, formatted_address }>` — Calls Google Geocoding API, returns first result. Throws on API errors or zero results.

### SMS Service (`backend/services/sms.ts`)

- `sendSms(to: string, message: string): Promise<{ sid, status, error? }>` — Sends via Twilio SDK, returns message SID and status.

### Publish Service (`backend/services/publish-service.ts`)

Orchestrates the publish flow: load route → load farmers → proximity match → send SMS → log notifications → mark published.

## Logging

Every service function logs its entry, result, and any errors via `console.log` / `console.error`. No structured logging library — plain console output for the prototype.

**What gets logged:**
- **API requests**: method, path, response status (in the route handler)
- **Service calls**: function name, key params (farmer phone, route id), result summary
- **External API calls**: geocoding requests/results, Twilio send results (SID + status)
- **Proximity matching**: how many farmers checked, how many matched
- **Errors**: full error message + stack for any caught exceptions

Example:
```
[publish-service] Publishing route abc-123
[publish-service] Loaded 87 non-opted-out farmers
[proximity] Checking 87 farmers against 312 route points (10mi radius)
[proximity] Matched 14 farmers
[sms] Sending to +15055551234 → sid: SMxxx, status: sent
[sms] Sending to +15055559876 → FAILED: Invalid phone number
[publish-service] Published route abc-123: 13 sent, 1 failed
```

## Error Handling

Prototype mode — minimal error handling. Only critical cases:

1. **SMS failure per-farmer**: Logged to `notification_log` with status "failed", does not block remaining SMS sends
2. **Publish already-published route**: Returns 409 Conflict
3. **Route not found on publish**: Returns 404

All other errors: standard HTTP error responses with console.error logging. No special handling for geocode failures, missing env vars, empty route_points, etc.

## Frontend Dependencies

The frontend team needs to update these components to work with the real backend. All component paths are now at root (not inside `frontend/`).

1. **GoogleRoutePlanner**: Add real Google Routes API call to get route path (currently uses hardcoded mock positions). Decode the returned polyline into `Array<{lat, lng}>` and include it as `route_points` when creating a route.

2. **RouteForm**: Wire "Save route draft" to `POST /api/routes` and "Notify nearby farmers" to `PATCH /api/routes/:id/publish`. Replace mock state with real API calls.

3. **Farmer registration page**: Add form for name, phone, address. Optionally use browser GPS for auto-fill. Submit to `POST /api/farmers`.

4. **Respond page**: New page at `/respond?route=uuid&farmer=uuid` that fetches route + farmer + hub info and renders a pre-filled form with response type selection.

## Pre-Seed Data

- One hub account: "Roadrunner Food Bank" with test phone/email
- No seed farmers — they register via the web form
