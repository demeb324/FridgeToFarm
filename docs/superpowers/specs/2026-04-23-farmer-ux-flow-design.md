# Farmer UX Flow Design Spec

**Date:** 2026-04-23
**Status:** Draft
**Scope:** Farmer-facing registration, SMS notification, response flow, and support rep proxy dashboard

---

## Background

FridgeToFarm connects rural farmers to delivery hubs. The core loop: a hub publishes a route, farmers within 10 miles get an SMS, farmers respond to opt in for crop or compost pickup.

This spec covers the **farmer UX flow** end-to-end, including the support rep's proxy dashboard for managing farmer records on their behalf. The farmer is a low-tech user who interacts exclusively via SMS and simple mobile web forms. No logins, no app downloads, no dashboards.

### Design Decisions (resolved)

| Decision | Resolution |
|---|---|
| Farmer's primary channel | SMS with hub contact details + link to response form (A+B) |
| Registration | Self-service mobile page (`/register`) + support rep can register on behalf |
| Proxy operator | Human support rep (not LLM) |
| Proxy capabilities | Create route responses on behalf of farmer, edit farmer profile, toggle opt-out |
| Hub association | Implicit proximity-based — any route within 10 miles triggers SMS |
| Opt-out paths | Reply STOP, tap unsubscribe link, or tell support rep verbally |
| Profile updates | Support rep only — no self-service edit page |
| LLM integration | Deferred to future phase |

---

## Architecture

**Implementation approach: Patch existing pages (Approach A).** Reuse the existing SMS pipeline, response form, and proximity matcher. Add new pages and API endpoints alongside. No database schema changes required.

### Data flow

```
Farmer registers at /register
  → POST /api/farmers (upsert by phone, geocode address)
  → Farmer record in database

Hub publishes route
  → Proximity matching via find_farmers_near_route_points
  → SMS sent via Twilio (includes response link + hub contact + unsubscribe link)
  → Notification logged

Farmer responds (self-serve)
  → Taps link → /respond?route=...&farmer=...
  → Selects crop/compost/both → POST /api/responses
  → Confirmation screen

Farmer responds (phone call)
  → Calls hub directly (contact details in SMS)
  → Support rep opens /farmer/[id] → "Respond on behalf" → POST /api/responses
  → Same response record as self-serve

Farmer opts out
  → Reply STOP (Twilio handles) OR
  → Tap unsubscribe link → /unsubscribe → PATCH /api/farmers/[id] (opted_out: true) OR
  → Tell support rep → rep toggles opted_out in proxy view
```

---

## Component Specifications

### 1. Farmer Self-Registration Page (`/register`)

**Route:** `app/register/page.tsx` (new file)

Public, mobile-optimized, single-screen form. No authentication.

**Fields:**
- Name (text, required)
- Phone (tel, required)
- Address or zip code (text, required)
- "Use my location" button — Browser Geolocation API, auto-fills address via reverse geocoding

**Submission flow:**
1. Farmer fills out 3 fields
2. Optionally taps "Use my location" to auto-fill address
3. Submits to `POST /api/farmers` (existing endpoint, upserts on phone number)
4. Geocoding happens server-side if lat/lng not provided by browser
5. On success: confirmation screen — "You're registered! We'll text you when a delivery route is planned near your farm."
6. On error: inline error message (geocode failure, invalid input)

**Design constraints:**
- Single screen, no multi-step wizard
- Large touch targets for mobile
- Matches existing visual language (rounded corners, stone/emerald palette)

**API:** No new endpoint. `POST /api/farmers` already handles registration.

---

### 2. Support Rep Farmer List (`/farmers`)

**Route:** `app/farmers/page.tsx` (new file)

Searchable list of all registered farmers. The support rep's primary navigation tool.

**Layout:** Uses existing `SidebarNav` + main content pattern (consistent with `/farmer`, `/hub` pages).

**Sidebar nav items:**
- Farmers (current page)
- Route planning (`/routes`)
- Sign in (`/auth/sign-in`)

**Content:**
- Search bar — filters by name or phone number
- Farmer cards — each shows: name, phone, address, opted-out badge (if applicable), registration date
- Each card links to `/farmer/[id]` (proxy detail view)

**New API handler:** `GET /api/farmers` (added to existing `app/api/farmers/route.ts` alongside the current `POST` handler)
- Query params: `search` (optional, filters name or phone with case-insensitive partial match)
- Returns: `Array<{ id, name, phone, address_text, opted_out, created_at }>`
- Ordered by `created_at` descending

---

### 3. Support Rep Farmer Detail View (`/farmer/[id]`)

**Route:** `app/farmer/[id]/page.tsx` (new file, replaces current `app/farmer/page.tsx`)

The complete proxy view for managing a single farmer. Server component that loads farmer data, with client components for interactive sections.

**Sections:**

#### 3a. Profile Header
- Displays: name, phone, address, opted-out status
- "Edit" button toggles inline editing of name, phone, address
- Opted-out toggle switch
- Save calls `PATCH /api/farmers/{id}`
- If address changes, re-geocodes server-side

#### 3b. Open Opportunities
- Reuses existing `GET /api/farmers/{id}/opportunities` endpoint
- Each opportunity card shows: route title, hub name, date, distance, pickup window
- New **"Respond on behalf"** button on each card
  - Opens a form (inline or modal): crop_pickup / compost_pickup / both radio buttons + optional notes field
  - Submits to `POST /api/responses` with `farmer_id` and `route_id` prefilled
  - Same endpoint the farmer uses — the rep is filling it in for them

#### 3c. Response History
- Lists all route responses for this farmer (submitted by farmer or on their behalf)
- Columns: route title, response type (crop/compost/both), status (pending/confirmed/cancelled), date
- Calls new `GET /api/farmers/{id}/responses` endpoint

#### 3d. Notification History
- Reuses existing `GET /api/farmers/{id}/notifications` endpoint
- Shows SMS log: sent/failed/opted_out status, route title, timestamp

**Old `app/farmer/page.tsx`** is deleted. The hardcoded `DEMO_FARMER_ID` page is replaced by this dynamic route.

**New API endpoints:**

`PATCH /api/farmers/[id]`
- Body: `{ name?, phone?, address_text?, opted_out? }`
- If address changes, re-geocodes and updates lat/lng
- Returns updated farmer record

`GET /api/farmers/[id]/responses`
- Returns array of route responses for this farmer
- Joins with routes table for route title
- Ordered by created_at descending
- Shape: `Array<{ id, route_id, route_title, response_type, status, notes, created_at }>`

---

### 4. SMS Unsubscribe Link

**Modified file:** `backend/services/sms.ts`

Update `formatRouteSmsMessage` to append an unsubscribe link to every outbound SMS:

```
Reply STOP or tap to unsubscribe: {BASE_URL}/unsubscribe?farmer={farmer_id}
```

**New route:** `app/unsubscribe/page.tsx`
- Query params: `farmer` (farmer UUID)
- Loads farmer record
- Shows: "Unsubscribe {farmer name} from SMS notifications?" with confirm button
- On confirm: calls `PATCH /api/farmers/{id}` with `opted_out: true`
- Shows confirmation: "You've been unsubscribed. You can re-register by calling the hub."
- If farmer not found: generic error message

**Security note:** The unsubscribe link uses the farmer's UUID as the identifier. UUIDs are unguessable (128-bit), so this provides adequate protection for the MVP. No additional authentication is required.

**Twilio STOP handling:** Configured in Twilio console (no code). Covers farmers who reply STOP to the SMS. Note: Twilio's STOP block operates on Twilio's side only — it does not update our `opted_out` column. The farmer won't receive messages regardless, but the support rep won't see them as opted out unless they toggle it manually or the farmer uses the unsubscribe link instead. Syncing Twilio opt-out events to our database would require an inbound webhook endpoint, which is out of scope for MVP.

---

### 5. `/respond` Page Enhancements

**Modified file:** `app/respond/page.tsx`

Two changes to the existing response form:

1. **Hub contact card moved above the form.** Farmers who want to call should see the phone number without scrolling past the form.

2. **Post-submission confirmation screen.** Currently the page is a server component and the form submits via HTML form POST to `/api/responses` with no feedback. Extract the form into a client component (`"use client"`) that:
   - Prevents default form submission
   - POSTs via `fetch` to `/api/responses`
   - On success: shows "Your response has been recorded. The hub will contact you if needed."
   - On error: shows inline error, form remains editable
   - The server component (`app/respond/page.tsx`) continues to load route/farmer data and passes it to the client form component

---

### 6. API Client Updates

**Modified file:** `lib/api/client.ts`

Add new methods to the `api` object:

```typescript
// Farmer management (support rep)
listFarmers: (search?: string) =>
  http<FarmerSummary[]>(search ? `/api/farmers?search=${encodeURIComponent(search)}` : "/api/farmers"),

updateFarmer: (id: string, payload: { name?: string; phone?: string; address_text?: string; opted_out?: boolean }) =>
  http<FarmerDetail>(`/api/farmers/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  }),

listFarmerResponses: (farmerId: string) =>
  http<FarmerResponseItem[]>(`/api/farmers/${farmerId}/responses`),
```

New types:

```typescript
export type FarmerSummary = {
  id: string; name: string; phone: string;
  address_text: string; opted_out: boolean; created_at: string;
};

export type FarmerDetail = FarmerSummary & {
  latitude: number; longitude: number; updated_at: string;
};

export type FarmerResponseItem = {
  id: string; route_id: string; route_title: string;
  response_type: "crop_pickup" | "compost_pickup" | "both";
  status: "pending" | "confirmed" | "cancelled";
  notes: string | null; created_at: string;
};
```

---

### 7. SMS Test UI (`/sms-test`)

**Route:** `app/sms-test/page.tsx` (new file)

A mock SMS inbox for development and demo use. Simulates what a farmer sees on their phone — messages listed in conversation style with clickable response links. Allows testing the full SMS → respond flow without a real phone or active Twilio credentials.

**Dev-only.** This page should be excluded from production builds (guarded by `NODE_ENV !== 'production'` or omitted from the deployed app).

**Layout:**
- Dropdown to select a farmer (populated from `GET /api/farmers`)
- Mock phone frame containing an SMS inbox view
- Messages rendered as chat-style bubbles (green for inbound/hub, white for context)
- Each message shows: hub name, route date, response URL (clickable), unsubscribe link (clickable), hub contact details
- Messages are pulled from `notification_log` for the selected farmer

**SMS dry-run mode:** Add `SMS_DRY_RUN` environment variable support to `backend/services/sms.ts`. When `SMS_DRY_RUN=true`:
- `sendSms()` skips the Twilio API call entirely
- Logs the message content to console
- Returns `{ sid: "dry-run", status: "sent" }` — the same shape as a real send
- The notification is still written to `notification_log` with status `sent` and `twilio_sid: "dry-run"`
- The SMS test UI can then display these logged messages

This allows the full flow — hub publishes route → proximity matching runs → messages logged → test UI shows them → click link → test `/respond` — without any external SMS cost or a real phone.

**Modified file:** `backend/services/sms.ts`
- Add dry-run check at the top of `sendSms()`: if `process.env.SMS_DRY_RUN === 'true'`, log and return early

---

## File Change Summary

| Action | File | Description |
|---|---|---|
| New | `app/register/page.tsx` | Farmer self-registration form |
| New | `app/farmers/page.tsx` | Support rep farmer list with search |
| New | `app/farmer/[id]/page.tsx` | Support rep farmer detail view (proxy dashboard) |
| New | `app/unsubscribe/page.tsx` | Farmer opt-out page |
| New | `app/sms-test/page.tsx` | Dev-only mock SMS inbox for testing |
| New | `app/api/farmers/[id]/route.ts` | `PATCH /api/farmers/:id` handler |
| New | `app/api/farmers/[id]/responses/route.ts` | `GET /api/farmers/:id/responses` handler |
| Modify | `app/api/farmers/route.ts` | Add `GET` handler (list with search) alongside existing `POST` |
| Modify | `backend/services/sms.ts` | Add unsubscribe link to `formatRouteSmsMessage` + SMS_DRY_RUN support |
| Modify | `app/respond/page.tsx` | Move hub contact above form, add submission confirmation |
| Modify | `lib/api/client.ts` | Add farmer management API methods and types |
| Delete | `app/farmer/page.tsx` | Replaced by dynamic `app/farmer/[id]/page.tsx` |

**No database migrations required.** All columns needed (`opted_out`, `phone`, `address_text`, etc.) exist in the current schema.

---

## Out of Scope

- Authentication/gating for support rep pages (use existing Supabase Auth)
- Route → farmer drill-down view (deferred)
- LLM-assisted experiences (deferred)
- Farmer self-service profile editing
- Farmer-specific hub opt-in/opt-out (proximity-based matching remains)
- WhatsApp or other messaging channels
- Two-way SMS conversation

---

## Testing Approach

- **API endpoints:** Unit tests for `GET /api/farmers`, `PATCH /api/farmers/[id]`, `GET /api/farmers/[id]/responses`
- **Registration page:** Manual validation — register a farmer, confirm record in database, confirm geocoding
- **SMS flow:** Use `/sms-test` page with `SMS_DRY_RUN=true` — publish route, see messages in mock inbox, click link to test `/respond`
- **Proxy dashboard:** Manual — support rep views farmer, edits profile, responds on behalf
- **Respond page:** Manual — submit response, confirm success screen appears
