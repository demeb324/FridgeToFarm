# Farmer UX Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full farmer-facing UX — self-registration, SMS notification with unsubscribe, response form with confirmation, and a support rep proxy dashboard for managing farmers — with a dev-only SMS test UI for end-to-end testing without a real phone.

**Architecture:** Patch existing pages and endpoints (Approach A from spec). New Next.js App Router pages for `/register`, `/farmers`, `/farmer/[id]`, `/unsubscribe`, and `/sms-test`. New API handlers for `GET /api/farmers`, `PATCH /api/farmers/[id]`, and `GET /api/farmers/[id]/responses`. Modify existing SMS service for dry-run mode and unsubscribe links. Extract `/respond` form into a client component with fetch-based submission and confirmation screen.

**Tech Stack:** Next.js 16 App Router, Supabase via `createAdminSupabaseClient`, TanStack React Query, Tailwind CSS (rounded-[2rem] card pattern), Vitest integration tests, Twilio SMS (with `SMS_DRY_RUN` mode).

**Spec:** `docs/superpowers/specs/2026-04-23-farmer-ux-flow-design.md`

---

## File Map

**Created**

- `app/register/page.tsx` — Farmer self-registration form (public, mobile-optimized)
- `app/farmers/page.tsx` — Support rep farmer list with search
- `app/farmer/[id]/page.tsx` — Support rep farmer detail proxy dashboard (replaces `app/farmer/page.tsx`)
- `app/unsubscribe/page.tsx` — Farmer opt-out confirmation page
- `app/sms-test/page.tsx` — Dev-only mock SMS inbox
- `app/api/farmers/[id]/route.ts` — `PATCH /api/farmers/:id` handler
- `app/api/farmers/[id]/responses/route.ts` — `GET /api/farmers/:id/responses` handler
- `app/respond/respond-form.tsx` — Client component extracted from respond page
- `tests/api/farmers/list.test.ts` — integration test for GET /api/farmers
- `tests/api/farmers/[id]/patch.test.ts` — integration test for PATCH /api/farmers/:id
- `tests/api/farmers/[id]/responses.test.ts` — integration test for GET /api/farmers/:id/responses

**Modified**

- `lib/api/client.ts` — Add `FarmerSummary`, `FarmerDetail`, `FarmerResponseItem` types; add `listFarmers`, `updateFarmer`, `listFarmerResponses` methods
- `app/api/farmers/route.ts` — Add `GET` handler alongside existing `POST`
- `backend/services/sms.ts` — Add `farmerId` param to `formatRouteSmsMessage` (unsubscribe link), add `SMS_DRY_RUN` early return in `sendSms`
- `app/respond/page.tsx` — Move hub contact card above form, import and render `RespondForm` client component
- `lib/services/publish-route.ts` — Pass `farmerId` to `formatRouteSmsMessage` call

**Deleted**

- `app/farmer/page.tsx` — Replaced by dynamic `app/farmer/[id]/page.tsx`

---

## Conventions

- **Error envelope:** All new endpoints return `{ error: string }` on failure with appropriate HTTP status. Matches existing pattern in `app/api/routes/route.ts`.
- **Validation:** Reuse helpers from `lib/api/validation.ts` (`asString`, `asBoolean`, `isRecord`, etc.).
- **Supabase client:** `createAdminSupabaseClient()` from `@/lib/supabase/server` in all route handlers.
- **UUID validation:** `const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i` — same pattern used in existing `[id]` handlers.
- **Context type:** `type Ctx = { params: Promise<{ id: string }> }` for dynamic route handlers with Next.js 16 async params.
- **UI style:** `rounded-[2rem]` cards, `border-stone-200`, `shadow-sm`, `text-sm`, stone/emerald palette. Matches existing `app/farmer/page.tsx` and `components/sidebar-nav.tsx`.
- **Test IDs:** Each test file uses `itest-<feature>-${Date.now()}` tag suffix and cleans up in `afterAll`, matching `tests/api/farmers/[id]/opportunities.test.ts`.
- **Commits:** One logical commit per task. Format: `feat(scope): short summary` or `test:`, `refactor:`, `chore:` as appropriate.

---

## Task 1: API Client Types & Methods

**Files:**
- Modify: `lib/api/client.ts`

This task adds the TypeScript types and API client methods that all subsequent tasks depend on.

- [ ] **Step 1: Add FarmerSummary, FarmerDetail, and FarmerResponseItem types**

Add after the `NearbyFarmer` type (around line 96) in `lib/api/client.ts`:

```typescript
export type FarmerSummary = {
  id: string;
  name: string;
  phone: string;
  address_text: string;
  opted_out: boolean;
  created_at: string;
};

export type FarmerDetail = FarmerSummary & {
  latitude: number;
  longitude: number;
  updated_at: string;
};

export type FarmerResponseItem = {
  id: string;
  route_id: string;
  route_title: string;
  response_type: "crop_pickup" | "compost_pickup" | "both";
  status: "pending" | "confirmed" | "cancelled";
  notes: string | null;
  created_at: string;
};
```

- [ ] **Step 2: Add listFarmers, updateFarmer, and listFarmerResponses methods to the `api` object**

Add inside the `api` object (after `listNearbyFarmers`, around line 141) in `lib/api/client.ts`:

```typescript
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

- [ ] **Step 3: Run type check to verify**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add lib/api/client.ts
git commit -m "feat(api): add farmer management types and client methods"
```

---

## Task 2: GET /api/farmers Handler

**Files:**
- Modify: `app/api/farmers/route.ts`
- Create: `tests/api/farmers/list.test.ts`

Adds a `GET` handler to the existing farmers route file that returns a searchable, ordered list of farmers.

- [ ] **Step 1: Write the GET handler**

Add a `GET` export to `app/api/farmers/route.ts`. The existing `POST` export stays untouched. Insert the `GET` function before the `POST` function:

```typescript
export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim() || "";

  const supabase = createAdminSupabaseClient();

  let query = supabase
    .from("farmers")
    .select("id, name, phone, address_text, opted_out, created_at")
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
```

- [ ] **Step 2: Write the integration test**

Create `tests/api/farmers/list.test.ts`:

```typescript
import { config } from "dotenv";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { GET } from "@/app/api/farmers/route";
import type { Database } from "@/lib/supabase/database.types";

config({ path: ".env.local" });

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const TAG = `itest-list-${Date.now()}`;
const farmerIds: string[] = [];

beforeAll(async () => {
  const phone1 = `+15059990001`;
  const phone2 = `+15059990002`;

  // Clean up any prior test data with these phones
  await supabase.from("farmers").delete().in("phone", [phone1, phone2]);

  const { data: f1 } = await supabase.from("farmers").insert({
    name: `${TAG} Alice`, phone: phone1,
    address_text: "1 Main St", latitude: 35.085, longitude: -106.651,
  }).select("id").single();
  farmerIds.push(f1!.id);

  const { data: f2 } = await supabase.from("farmers").insert({
    name: `${TAG} Bob`, phone: phone2,
    address_text: "2 Oak Ave", latitude: 35.09, longitude: -106.66,
  }).select("id").single();
  farmerIds.push(f2!.id);
});

afterAll(async () => {
  await supabase.from("farmers").delete().in("id", farmerIds);
});

describe("GET /api/farmers", () => {
  it("returns farmers ordered by created_at desc", async () => {
    const res = await GET(new Request("http://localhost/api/farmers"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json)).toBe(true);
    // Our test farmers should appear
    const names = json.map((f: { name: string }) => f.name);
    expect(names.some((n: string) => n.includes(TAG))).toBe(true);
  });

  it("filters by search query (name)", async () => {
    const res = await GET(new Request(`http://localhost/api/farmers?search=${encodeURIComponent(TAG + " Alice")}`));
    expect(res.status).toBe(200);
    const json = await res.json();
    const names = json.map((f: { name: string }) => f.name);
    expect(names.some((n: string) => n.includes("Alice"))).toBe(true);
    expect(names.every((n: string) => !n.includes("Bob"))).toBe(true);
  });

  it("returns empty array when no match", async () => {
    const res = await GET(new Request("http://localhost/api/farmers?search=zzzznotexist12345"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual([]);
  });
});
```

- [ ] **Step 3: Run the test**

Run: `npx vitest run tests/api/farmers/list.test.ts`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add app/api/farmers/route.ts tests/api/farmers/list.test.ts
git commit -m "feat(api): add GET /api/farmers handler with search"
```

---

## Task 3: PATCH /api/farmers/[id] Handler

**Files:**
- Create: `app/api/farmers/[id]/route.ts`
- Create: `tests/api/farmers/[id]/patch.test.ts`

New endpoint for updating farmer profile fields and toggling opt-out status. Re-geocodes if the address changes.

- [ ] **Step 1: Create the PATCH handler**

Create `app/api/farmers/[id]/route.ts`:

```typescript
import { NextResponse } from "next/server";

import { geocodeAddress } from "@backend/services/geocoding";
import { asBoolean, asString, isRecord } from "@/lib/api/validation";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Ctx) {
  const { id } = await context.params;

  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Farmer id must be a UUID." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 });
  }

  const name = asString(body.name) || undefined;
  const phone = asString(body.phone) || undefined;
  const addressText = asString(body.address_text) || undefined;
  const optedOut = asBoolean(body.opted_out);

  // At least one field must be provided
  if (name === undefined && phone === undefined && addressText === undefined && optedOut === undefined) {
    return NextResponse.json(
      { error: "At least one of name, phone, address_text, or opted_out is required." },
      { status: 400 },
    );
  }

  const supabase = createAdminSupabaseClient();

  // If address changed, re-geocode
  let latitude: number | undefined;
  let longitude: number | undefined;

  if (addressText !== undefined) {
    try {
      const geo = await geocodeAddress(addressText);
      latitude = geo.lat;
      longitude = geo.lng;
    } catch (geoError: any) {
      return NextResponse.json(
        { error: `Could not geocode address: ${geoError.message}` },
        { status: 400 },
      );
    }
  }

  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = name;
  if (phone !== undefined) update.phone = phone;
  if (addressText !== undefined) {
    update.address_text = addressText;
    update.latitude = latitude;
    update.longitude = longitude;
  }
  if (optedOut !== undefined) update.opted_out = optedOut;

  const { data, error } = await supabase
    .from("farmers")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Farmer not found." }, { status: 404 });
  }

  return NextResponse.json(data);
}
```

- [ ] **Step 2: Write the integration test**

Create `tests/api/farmers/[id]/patch.test.ts`:

```typescript
import { config } from "dotenv";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { PATCH } from "@/app/api/farmers/[id]/route";
import type { Database } from "@/lib/supabase/database.types";

config({ path: ".env.local" });

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const TAG = `itest-patch-${Date.now()}`;
let farmerId = "";

beforeAll(async () => {
  const phone = `+15059990100`;
  await supabase.from("farmers").delete().eq("phone", phone);
  const { data } = await supabase.from("farmers").insert({
    name: `${TAG} Farmer`, phone,
    address_text: "100 Patch St", latitude: 35.085, longitude: -106.651,
  }).select("id").single();
  farmerId = data!.id;
});

afterAll(async () => {
  await supabase.from("farmers").delete().eq("id", farmerId);
});

describe("PATCH /api/farmers/[id]", () => {
  it("updates opted_out", async () => {
    const res = await PATCH(
      new Request("http://localhost/api/farmers/" + farmerId, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ opted_out: true }),
      }),
      { params: Promise.resolve({ id: farmerId }) },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.opted_out).toBe(true);
  });

  it("updates name", async () => {
    const res = await PATCH(
      new Request("http://localhost/api/farmers/" + farmerId, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: `${TAG} Updated` }),
      }),
      { params: Promise.resolve({ id: farmerId }) },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.name).toBe(`${TAG} Updated`);
  });

  it("400 on invalid UUID", async () => {
    const res = await PATCH(
      new Request("http://localhost/api/farmers/nope", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "test" }),
      }),
      { params: Promise.resolve({ id: "nope" }) },
    );
    expect(res.status).toBe(400);
  });

  it("400 with no fields", async () => {
    const res = await PATCH(
      new Request("http://localhost/api/farmers/" + farmerId, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: farmerId }) },
    );
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 3: Run the test**

Run: `npx vitest run tests/api/farmers/[id]/patch.test.ts`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add app/api/farmers/[id]/route.ts tests/api/farmers/[id]/patch.test.ts
git commit -m "feat(api): add PATCH /api/farmers/:id handler with geocode"
```

---

## Task 4: GET /api/farmers/[id]/responses Handler

**Files:**
- Create: `app/api/farmers/[id]/responses/route.ts`
- Create: `tests/api/farmers/[id]/responses.test.ts`

Returns a farmer's route response history, joined with route titles.

- [ ] **Step 1: Create the responses handler**

Create `app/api/farmers/[id]/responses/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Ctx) {
  const { id } = await context.params;

  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Farmer id must be a UUID." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("route_responses")
    .select(`
      id, route_id, response_type, status, notes, created_at,
      routes ( title )
    `)
    .eq("farmer_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const shaped = (data ?? []).map((row: any) => ({
    id: row.id,
    route_id: row.route_id,
    route_title: row.routes?.title ?? "Unknown route",
    response_type: row.response_type,
    status: row.status,
    notes: row.notes,
    created_at: row.created_at,
  }));

  return NextResponse.json(shaped);
}
```

- [ ] **Step 2: Write the integration test**

Create `tests/api/farmers/[id]/responses.test.ts`:

```typescript
import { config } from "dotenv";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { GET } from "@/app/api/farmers/[id]/responses/route";
import type { Database } from "@/lib/supabase/database.types";

config({ path: ".env.local" });

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const HUB_ID = "1e53e9e8-11db-4012-9451-f996632cd250";
const TAG = `itest-resp-${Date.now()}`;
let farmerId = "";
let routeId = "";
let responseId = "";

beforeAll(async () => {
  const phone = `+15059990200`;
  await supabase.from("farmers").delete().eq("phone", phone);
  const { data: f } = await supabase.from("farmers").insert({
    name: `${TAG} Farmer`, phone,
    address_text: "200 Response Ave", latitude: 35.085, longitude: -106.651,
  }).select("id").single();
  farmerId = f!.id;

  const { data: r } = await supabase.from("routes").insert({
    hub_id: HUB_ID, title: `${TAG} Route`, route_polyline: "x",
    start_lat: 35.086, start_lng: -106.652,
    end_lat: 35.09, end_lng: -106.65,
    start_time: "2026-07-01T09:00:00Z", end_time: "2026-07-01T11:00:00Z",
    published: true,
  }).select("id").single();
  routeId = r!.id;

  const { data: rr } = await supabase.from("route_responses").insert({
    route_id: routeId, farmer_id: farmerId,
    response_type: "crop_pickup", status: "pending",
  }).select("id").single();
  responseId = rr!.id;
});

afterAll(async () => {
  await supabase.from("route_responses").delete().eq("id", responseId);
  await supabase.from("routes").delete().eq("id", routeId);
  await supabase.from("farmers").delete().eq("id", farmerId);
});

describe("GET /api/farmers/[id]/responses", () => {
  it("returns responses with route titles", async () => {
    const res = await GET(new Request(`http://localhost/api/farmers/${farmerId}/responses`), {
      params: Promise.resolve({ id: farmerId }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json)).toBe(true);
    const match = json.find((r: { route_id: string }) => r.route_id === routeId);
    expect(match).toBeDefined();
    expect(match.response_type).toBe("crop_pickup");
    expect(match.route_title).toContain(TAG);
  });

  it("400 on invalid farmer id", async () => {
    const res = await GET(new Request("http://localhost/api/farmers/nope/responses"), {
      params: Promise.resolve({ id: "nope" }),
    });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 3: Run the test**

Run: `npx vitest run tests/api/farmers/[id]/responses.test.ts`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add app/api/farmers/[id]/responses/route.ts tests/api/farmers/[id]/responses.test.ts
git commit -m "feat(api): add GET /api/farmers/:id/responses handler"
```

---

## Task 5: SMS Dry-Run Mode + Unsubscribe Link

**Files:**
- Modify: `backend/services/sms.ts`
- Modify: `lib/services/publish-route.ts`

Adds `SMS_DRY_RUN` support to `sendSms` and appends an unsubscribe link with `farmerId` to `formatRouteSmsMessage`.

- [ ] **Step 1: Add SMS_DRY_RUN early return to sendSms**

In `backend/services/sms.ts`, modify the `sendSms` function. Insert a dry-run check after the credential check (after line 22, before the `try` block):

```typescript
  // SMS_DRY_RUN: skip Twilio, log to console, return mock result
  if (process.env.SMS_DRY_RUN === "true") {
    console.log(`[sms] DRY RUN to ${to}: ${message}`);
    return { sid: "dry-run", status: "sent" };
  }
```

The full `sendSms` function should now read:

```typescript
export async function sendSms(to: string, message: string): Promise<SmsResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_PHONE_NUMBER

  if (!accountSid || !authToken || !fromNumber) {
    const error = "Twilio credentials not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)"
    console.error(`[sms] ${error}`)
    return { sid: "", status: "failed", error }
  }

  // SMS_DRY_RUN: skip Twilio, log to console, return mock result
  if (process.env.SMS_DRY_RUN === "true") {
    console.log(`[sms] DRY RUN to ${to}: ${message}`)
    return { sid: "dry-run", status: "sent" }
  }

  try {
    const client = new Twilio(accountSid, authToken)
    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: to,
    })

    console.log(`[sms] Sending to ${to} → sid: ${result.sid}, status: ${result.status}`)

    return {
      sid: result.sid,
      status: result.status === "queued" || result.status === "sent" ? "sent" : "failed",
    }
  } catch (error: any) {
    const errorMessage = error?.message || String(error)
    console.error(`[sms] Sending to ${to} → FAILED: ${errorMessage}`)
    return { sid: "", status: "failed", error: errorMessage }
  }
}
```

- [ ] **Step 2: Add farmerId parameter to formatRouteSmsMessage**

Replace the `formatRouteSmsMessage` function in `backend/services/sms.ts`:

```typescript
export function formatRouteSmsMessage(params: {
  hubName: string
  routeDate: string
  responseUrl: string
  hubPhone: string
  hubEmail: string
  farmerId: string
}): string {
  const { hubName, routeDate, responseUrl, hubPhone, hubEmail, farmerId } = params
  const baseUrl = process.env.BASE_URL || "http://localhost:3000"
  const unsubscribeUrl = `${baseUrl}/unsubscribe?farmer=${farmerId}`
  return `${hubName} has a delivery route near you on ${routeDate}. Tap to respond: ${responseUrl} Questions? Contact ${hubPhone} or ${hubEmail}. Reply STOP or tap to unsubscribe: ${unsubscribeUrl}`
}
```

- [ ] **Step 3: Update publish-route.ts to pass farmerId**

In `lib/services/publish-route.ts`, update the `formatRouteSmsMessage` call (around line 79). Change:

```typescript
    const message = formatRouteSmsMessage({
      hubName: hub.name,
      routeDate,
      responseUrl,
      hubPhone: hub.phone,
      hubEmail: hub.email,
    });
```

to:

```typescript
    const message = formatRouteSmsMessage({
      hubName: hub.name,
      routeDate,
      responseUrl,
      hubPhone: hub.phone,
      hubEmail: hub.email,
      farmerId: farmer.farmer_id,
    });
```

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 5: Commit**

```bash
git add backend/services/sms.ts lib/services/publish-route.ts
git commit -m "feat(sms): add dry-run mode and unsubscribe link to SMS messages"
```

---

## Task 6: Unsubscribe Page

**Files:**
- Create: `app/unsubscribe/page.tsx`

Public mobile page for farmers who tap the unsubscribe link in SMS. Confirms opt-out, then calls `PATCH /api/farmers/:id`.

- [ ] **Step 1: Create the unsubscribe page**

Create `app/unsubscribe/page.tsx`:

```typescript
"use client";

import { useMutation } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function UnsubscribePage() {
  const searchParams = useSearchParams();
  const farmerId = searchParams.get("farmer");

  const [confirmed, setConfirmed] = useState(false);

  const mutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/farmers/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ opted_out: true }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to unsubscribe.");
      }
      return res.json();
    },
    onSuccess: () => setConfirmed(true),
  });

  if (!farmerId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Invalid Link</h1>
          <p className="mt-2 text-sm text-slate-600">
            This unsubscribe link is invalid. Please contact the hub directly.
          </p>
        </div>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-emerald-900">You&apos;ve been unsubscribed</h1>
          <p className="mt-2 text-sm text-emerald-700">
            You will no longer receive SMS notifications. You can re-register by calling the hub directly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Unsubscribe from SMS</h1>
        <p className="mt-2 text-sm text-slate-600">
          Do you want to unsubscribe from all SMS notifications about delivery routes?
        </p>
        <button
          type="button"
          onClick={() => mutation.mutate(farmerId)}
          disabled={mutation.isPending}
          className="mt-6 w-full rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          {mutation.isPending ? "Unsubscribing…" : "Yes, unsubscribe me"}
        </button>
        {mutation.isError && (
          <p className="mt-3 text-sm text-red-600">{mutation.error.message}</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add app/unsubscribe/page.tsx
git commit -m "feat: add /unsubscribe page for SMS opt-out"
```

---

## Task 7: Registration Page

**Files:**
- Create: `app/register/page.tsx`

Public, mobile-optimized self-registration form. No authentication required. Uses existing `POST /api/farmers` endpoint.

- [ ] **Step 1: Create the registration page**

Create `app/register/page.tsx`:

```typescript
"use client";

import { useState } from "react";

type RegState = "idle" | "submitting" | "success" | "error";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [state, setState] = useState<RegState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/farmers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          address_text: address.trim(),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Registration failed. Please try again.");
      }

      setState("success");
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong.");
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100 p-4">
        <div className="w-full max-w-md rounded-[2rem] border border-emerald-200 bg-emerald-50 p-8 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">You&apos;re registered!</p>
          <h1 className="mt-2 text-2xl font-semibold text-emerald-900">
            We&apos;ll text you when a delivery route is planned near your farm.
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 p-4">
      <div className="w-full max-w-md rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">Register</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Sign up for delivery notifications
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          We&apos;ll text you when a food rescue route is planned near your farm. No login required.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Name
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400"
              />
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Phone number
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400"
              />
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Address or zip code
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Farm address or zip code"
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400"
              />
            </label>
          </div>

          {state === "error" && errorMsg && (
            <p className="text-sm text-red-600">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={state === "submitting"}
            className="w-full rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {state === "submitting" ? "Registering…" : "Register"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add app/register/page.tsx
git commit -m "feat: add /register page for farmer self-registration"
```

---

## Task 8: Support Rep Farmer List Page

**Files:**
- Create: `app/farmers/page.tsx`

Searchable list of all farmers. The support rep's primary navigation tool. Uses `GET /api/farmers` with TanStack Query.

- [ ] **Step 1: Create the farmer list page**

Create `app/farmers/page.tsx`:

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { SidebarNav } from "@/components/sidebar-nav";
import { api } from "@/lib/api/client";
import type { FarmerSummary } from "@/lib/api/client";

function FarmerCard({ farmer }: { farmer: FarmerSummary }) {
  return (
    <Link
      href={`/farmer/${farmer.id}`}
      className="block rounded-[2rem] border border-stone-200 bg-white p-5 shadow-sm hover:border-emerald-300 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">{farmer.name}</h3>
          <p className="mt-1 text-sm text-slate-600">{farmer.phone}</p>
          <p className="text-sm text-slate-500">{farmer.address_text}</p>
        </div>
        {farmer.opted_out && (
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
            Opted out
          </span>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Registered {new Date(farmer.created_at).toLocaleDateString()}
      </p>
    </Link>
  );
}

export default function FarmersListPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = search.trim();

  const farmersQ = useQuery({
    queryKey: ["farmers", debouncedSearch],
    queryFn: () => api.listFarmers(debouncedSearch || undefined),
  });

  return (
    <div className="min-h-screen bg-stone-100">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
          <SidebarNav
            title="Support rep"
            subtitle="Manage farmers and routes"
            items={[
              { href: "/farmers", label: "Farmers" },
              { href: "/routes", label: "Route planning" },
              { href: "/auth/sign-in", label: "Sign in" },
            ]}
          />

          <div className="space-y-6">
            <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
              <h1 className="text-2xl font-semibold text-slate-900">Farmers</h1>
              <p className="mt-1 text-sm text-slate-600">
                Search by name or phone number
              </p>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search farmers…"
                className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-400"
              />
            </section>

            <section className="grid gap-4">
              {farmersQ.isLoading && (
                <p className="text-sm text-slate-600">Loading farmers…</p>
              )}
              {farmersQ.isError && (
                <button
                  type="button"
                  onClick={() => farmersQ.refetch()}
                  className="rounded-[1.5rem] border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                >
                  Failed to load farmers. Tap to retry.
                </button>
              )}
              {farmersQ.data?.length === 0 && (
                <p className="text-sm text-slate-600">
                  {debouncedSearch ? "No farmers match your search." : "No farmers registered yet."}
                </p>
              )}
              {farmersQ.data?.map((farmer) => (
                <FarmerCard key={farmer.id} farmer={farmer} />
              ))}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add app/farmers/page.tsx
git commit -m "feat: add /farmers list page with search"
```

---

## Task 9: Support Rep Farmer Detail View (Proxy Dashboard)

**Files:**
- Create: `app/farmer/[id]/page.tsx`

The core proxy dashboard. Loads farmer data server-side, then uses client components for interactive sections (profile editing, respond on behalf, response/notification history).

This is the largest task. It has four sub-sections in the spec: profile header, open opportunities, response history, notification history.

- [ ] **Step 1: Create the farmer detail page**

Create `app/farmer/[id]/page.tsx`:

```typescript
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { FarmerDetailClient } from "./farmer-detail-client";

export const dynamic = "force-dynamic";

interface FarmerDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function FarmerDetailPage({ params }: FarmerDetailPageProps) {
  const { id } = await params;
  const supabase = createAdminSupabaseClient();

  const { data: farmer } = await supabase
    .from("farmers")
    .select("id, name, phone, address_text, opted_out, latitude, longitude, created_at, updated_at")
    .eq("id", id)
    .single();

  if (!farmer) {
    notFound();
  }

  return <FarmerDetailClient farmer={farmer} />;
}
```

- [ ] **Step 2: Create the client component for interactive sections**

Create `app/farmer/[id]/farmer-detail-client.tsx`:

```typescript
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { SidebarNav } from "@/components/sidebar-nav";
import { api } from "@/lib/api/client";
import type { FarmerDetail, FarmerResponseItem } from "@/lib/api/client";

const RESPONSE_TYPES = [
  { value: "crop_pickup", label: "Crop Pickup" },
  { value: "compost_pickup", label: "Compost Pickup" },
  { value: "both", label: "Both" },
] as const;

function ProfileHeader({ farmer }: { farmer: FarmerDetail }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(farmer.name);
  const [phone, setPhone] = useState(farmer.phone);
  const [address, setAddress] = useState(farmer.address_text);

  const updateMutation = useMutation({
    mutationFn: (payload: { name?: string; phone?: string; address_text?: string; opted_out?: boolean }) =>
      api.updateFarmer(farmer.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["farmer", farmer.id] });
      setEditing(false);
    },
  });

  return (
    <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Farmer Profile
          </p>
          {!editing ? (
            <>
              <h1 className="mt-2 text-2xl font-semibold text-slate-900">{farmer.name}</h1>
              <p className="mt-1 text-sm text-slate-600">{farmer.phone}</p>
              <p className="text-sm text-slate-500">{farmer.address_text}</p>
            </>
          ) : (
            <div className="mt-2 space-y-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-emerald-400"
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-emerald-400"
              />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-emerald-400"
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {farmer.opted_out && (
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
              Opted out
            </span>
          )}
          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-medium text-slate-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => updateMutation.mutate({ name, phone, address_text: address })}
                disabled={updateMutation.isPending}
                className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {updateMutation.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          )}
        </div>
      </div>
      {updateMutation.isError && (
        <p className="mt-2 text-sm text-red-600">{updateMutation.error.message}</p>
      )}
    </section>
  );
}

function OptOutToggle({ farmer }: { farmer: FarmerDetail }) {
  const qc = useQueryClient();
  const newValue = !farmer.opted_out;

  const mutation = useMutation({
    mutationFn: () => api.updateFarmer(farmer.id, { opted_out: newValue }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["farmer", farmer.id] }),
  });

  return (
    <button
      type="button"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      className={`rounded-full px-4 py-2 text-xs font-medium ${
        farmer.opted_out
          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
          : "bg-red-100 text-red-700 hover:bg-red-200"
      } disabled:opacity-50`}
    >
      {mutation.isPending
        ? "Updating…"
        : farmer.opted_out
          ? "Re-enable SMS"
          : "Opt out of SMS"}
    </button>
  );
}

function RespondOnBehalf({ farmerId, routeId, routeTitle }: { farmerId: string; routeId: string; routeTitle: string }) {
  const qc = useQueryClient();
  const [responseType, setResponseType] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [open, setOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      fetch("/api/responses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          farmer_id: farmerId,
          route_id: routeId,
          response_type: responseType,
          notes: notes || null,
        }),
      }).then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to submit response.");
        }
        return res.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["responses", farmerId] });
      qc.invalidateQueries({ queryKey: ["opportunities", farmerId] });
      setOpen(false);
      setResponseType("");
      setNotes("");
    },
  });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700"
      >
        Respond on behalf
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-medium text-slate-900">Respond to: {routeTitle}</p>
      <div className="mt-3 space-y-2">
        {RESPONSE_TYPES.map((t) => (
          <label key={t.value} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50 cursor-pointer">
            <input
              type="radio"
              name={`response-${routeId}`}
              value={t.value}
              checked={responseType === t.value}
              onChange={() => setResponseType(t.value)}
              className="h-4 w-4 text-emerald-600"
            />
            <span className="text-sm text-slate-700">{t.label}</span>
          </label>
        ))}
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        rows={2}
        className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-emerald-400"
      />
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={!responseType || mutation.isPending}
          className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {mutation.isPending ? "Submitting…" : "Submit"}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setResponseType(""); setNotes(""); }}
          className="rounded-full border border-slate-200 px-4 py-2 text-xs font-medium text-slate-500"
        >
          Cancel
        </button>
      </div>
      {mutation.isError && (
        <p className="mt-2 text-sm text-red-600">{mutation.error.message}</p>
      )}
    </div>
  );
}

function ResponseHistory({ responses }: { responses: FarmerResponseItem[] }) {
  if (responses.length === 0) {
    return <p className="text-sm text-slate-500">No responses yet.</p>;
  }

  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    confirmed: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-2">
      {responses.map((r) => (
        <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-slate-900">{r.route_title}</p>
              <p className="text-sm text-slate-500">
                {r.response_type.replace("_", " ")} · {new Date(r.created_at).toLocaleDateString()}
              </p>
              {r.notes && <p className="mt-1 text-sm text-slate-600">{r.notes}</p>}
            </div>
            <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[r.status] || "bg-slate-100 text-slate-700"}`}>
              {r.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function FarmerDetailClient({ farmer }: { farmer: FarmerDetail }) {
  const opportunitiesQ = useQuery({
    queryKey: ["opportunities", farmer.id],
    queryFn: () => api.listOpportunities(farmer.id),
  });

  const responsesQ = useQuery({
    queryKey: ["responses", farmer.id],
    queryFn: () => api.listFarmerResponses(farmer.id),
  });

  const notificationsQ = useQuery({
    queryKey: ["notifications", farmer.id],
    queryFn: () => api.listNotifications(farmer.id),
  });

  return (
    <div className="min-h-screen bg-stone-100">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
          <SidebarNav
            title="Support rep"
            subtitle="Manage farmers and routes"
            items={[
              { href: "/farmers", label: "Farmers" },
              { href: "/routes", label: "Route planning" },
              { href: "/auth/sign-in", label: "Sign in" },
            ]}
          />

          <div className="space-y-6">
            <ProfileHeader farmer={farmer} />
            <OptOutToggle farmer={farmer} />

            {/* Open Opportunities */}
            <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">
                Open Opportunities
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">
                Nearby routes this farmer can join
              </h2>
              <div className="mt-4 grid gap-3">
                {opportunitiesQ.isLoading && <p className="text-sm text-slate-600">Loading…</p>}
                {opportunitiesQ.isError && (
                  <button
                    type="button"
                    onClick={() => opportunitiesQ.refetch()}
                    className="rounded-[1.5rem] border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                  >
                    Failed to load. Tap to retry.
                  </button>
                )}
                {opportunitiesQ.data?.length === 0 && (
                  <p className="text-sm text-slate-600">No open routes near this farmer.</p>
                )}
                {opportunitiesQ.data?.map((o) => (
                  <div key={o.routeId} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{o.routeTitle}</p>
                        <p className="text-sm text-slate-600">{o.hubName} · {o.routeDate}</p>
                        <p className="text-sm text-slate-500">{o.pickupWindow} · {o.distanceMiles} mi away</p>
                      </div>
                    </div>
                    <RespondOnBehalf
                      farmerId={farmer.id}
                      routeId={o.routeId}
                      routeTitle={o.routeTitle}
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Response History */}
            <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Response History
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">Past responses</h2>
              <div className="mt-4">
                {responsesQ.isLoading && <p className="text-sm text-slate-600">Loading…</p>}
                {responsesQ.isError && (
                  <button
                    type="button"
                    onClick={() => responsesQ.refetch()}
                    className="rounded-[1.5rem] border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                  >
                    Failed to load. Tap to retry.
                  </button>
                )}
                {responsesQ.data && <ResponseHistory responses={responsesQ.data} />}
              </div>
            </section>

            {/* Notification History */}
            <section className="rounded-[2rem] border border-stone-950 bg-stone-950 p-6 text-stone-50 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-300">SMS History</p>
              <h2 className="mt-2 text-xl font-semibold">Message feed</h2>
              <div className="mt-5 grid gap-3">
                {notificationsQ.isLoading && <p className="text-sm text-stone-300">Loading…</p>}
                {notificationsQ.isError && (
                  <button
                    type="button"
                    onClick={() => notificationsQ.refetch()}
                    className="rounded-[1.25rem] border border-red-300 bg-red-950 p-4 text-sm text-red-100"
                  >
                    Failed to load. Tap to retry.
                  </button>
                )}
                {notificationsQ.data?.length === 0 && (
                  <p className="text-sm text-stone-300">No messages yet.</p>
                )}
                {notificationsQ.data?.map((n) => (
                  <div key={n.id} className="rounded-[1.25rem] border border-stone-700 bg-stone-900 p-4">
                    <p className="text-xs text-stone-400">{n.sender} · {n.timestamp}</p>
                    <p className="mt-1 text-sm text-stone-200">{n.message}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add app/farmer/[id]/page.tsx app/farmer/[id]/farmer-detail-client.tsx
git commit -m "feat: add /farmer/[id] proxy dashboard with profile, opportunities, responses, SMS history"
```

---

## Task 10: Respond Page Enhancement

**Files:**
- Create: `app/respond/respond-form.tsx`
- Modify: `app/respond/page.tsx`

Two changes: (1) move hub contact card above the form, (2) extract form into a client component with fetch-based submission and confirmation screen.

- [ ] **Step 1: Create the client form component**

Create `app/respond/respond-form.tsx`:

```typescript
"use client";

import { useState } from "react";

type RespondFormProps = {
  routeId: string;
  farmerId: string;
  routeTitle: string;
  hubName: string;
  hubPhone: string;
  hubEmail: string;
  startTime: string;
  endTime: string;
  notes: string | null;
};

type FormState = "idle" | "submitting" | "success" | "error";

export function RespondForm({
  routeId,
  farmerId,
  routeTitle,
  hubName,
  hubPhone,
  hubEmail,
  startTime,
  endTime,
  notes,
}: RespondFormProps) {
  const [responseType, setResponseType] = useState("");
  const [responseNotes, setResponseNotes] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormState("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/responses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          route_id: routeId,
          farmer_id: farmerId,
          response_type: responseType,
          notes: responseNotes || null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to submit response.");
      }

      setFormState("success");
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong.");
      setFormState("error");
    }
  }

  if (formState === "success") {
    return (
      <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">Response recorded</p>
        <h2 className="mt-2 text-xl font-semibold text-emerald-900">
          Your response has been recorded. The hub will contact you if needed.
        </h2>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <input type="hidden" name="route_id" value={routeId} />
      <input type="hidden" name="farmer_id" value={farmerId} />

      <div>
        <p className="text-sm font-medium text-slate-700">What would you like?</p>
        <div className="mt-2 space-y-2">
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50 cursor-pointer">
            <input
              type="radio"
              name="response_type"
              value="crop_pickup"
              checked={responseType === "crop_pickup"}
              onChange={() => setResponseType("crop_pickup")}
              className="h-4 w-4 text-emerald-600"
            />
            <span className="text-sm text-slate-700">Crop Pickup</span>
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50 cursor-pointer">
            <input
              type="radio"
              name="response_type"
              value="compost_pickup"
              checked={responseType === "compost_pickup"}
              onChange={() => setResponseType("compost_pickup")}
              className="h-4 w-4 text-emerald-600"
            />
            <span className="text-sm text-slate-700">Compost Pickup</span>
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50 cursor-pointer">
            <input
              type="radio"
              name="response_type"
              value="both"
              checked={responseType === "both"}
              onChange={() => setResponseType("both")}
              className="h-4 w-4 text-emerald-600"
            />
            <span className="text-sm text-slate-700">Both</span>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Notes (optional)
          <textarea
            value={responseNotes}
            onChange={(e) => setResponseNotes(e.target.value)}
            rows={3}
            placeholder="e.g., What crops, how much compost…"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400"
          />
        </label>
      </div>

      {formState === "error" && errorMsg && (
        <p className="text-sm text-red-600">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={!responseType || formState === "submitting"}
        className="w-full rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {formState === "submitting" ? "Submitting…" : "Submit Response"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Rewrite the respond page to use the client component**

Replace the entire content of `app/respond/page.tsx`:

```typescript
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { RespondForm } from "./respond-form";

interface RespondPageProps {
  searchParams: Promise<{ route?: string; farmer?: string }>;
}

export default async function RespondPage({ searchParams }: RespondPageProps) {
  const params = await searchParams;
  const routeId = params.route;
  const farmerId = params.farmer;

  if (!routeId || !farmerId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Invalid Link</h1>
          <p className="mt-2 text-slate-600">
            This response link is missing required information. Please contact the hub directly.
          </p>
        </div>
      </div>
    );
  }

  const supabase = createAdminSupabaseClient();

  const { data: routeData } = await supabase
    .from("routes")
    .select("*, hubs ( id, name, phone, email )")
    .eq("id", routeId)
    .single();

  if (!routeData) {
    notFound();
  }

  const { data: farmer } = await supabase
    .from("farmers")
    .select("id, name")
    .eq("id", farmerId)
    .single();

  if (!farmer) {
    notFound();
  }

  const hub = routeData.hubs;
  const startTime = new Date(routeData.start_time).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const endTime = new Date(routeData.end_time).toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">
          Delivery Route Notification
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{routeData.title}</h1>

        <div className="mt-4 space-y-2 text-sm text-slate-600">
          <p><span className="font-medium text-slate-900">Hub:</span> {hub.name}</p>
          <p><span className="font-medium text-slate-900">Farmer:</span> {farmer.name}</p>
          <p><span className="font-medium text-slate-900">Date:</span> {startTime} – {endTime}</p>
          {routeData.notes && (
            <p><span className="font-medium text-slate-900">Notes:</span> {routeData.notes}</p>
          )}
        </div>

        {/* Hub contact card — above the form per spec */}
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Hub Contact</p>
          <p className="mt-1 text-sm text-slate-700">Phone: {hub.phone}</p>
          <p className="text-sm text-slate-700">Email: {hub.email}</p>
        </div>

        <RespondForm
          routeId={routeId}
          farmerId={farmerId}
          routeTitle={routeData.title}
          hubName={hub.name}
          hubPhone={hub.phone}
          hubEmail={hub.email}
          startTime={startTime}
          endTime={endTime}
          notes={routeData.notes}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add app/respond/page.tsx app/respond/respond-form.tsx
git commit -m "feat: add submit confirmation and hub contact reordering to /respond"
```

---

## Task 11: SMS Test UI

**Files:**
- Create: `app/sms-test/page.tsx`

Dev-only mock SMS inbox. Simulates what a farmer sees on their phone. Uses `NODE_ENV` guard to exclude from production.

- [ ] **Step 1: Create the SMS test page**

Create `app/sms-test/page.tsx`:

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api/client";
import type { FarmerSummary, FarmerNotification } from "@/lib/api/client";

function SmsBubble({ notification }: { notification: FarmerNotification }) {
  return (
    <div className="rounded-xl rounded-bl-sm bg-emerald-100 px-4 py-3 text-sm text-slate-900">
      <p className="font-medium text-emerald-800">{notification.sender}</p>
      <p className="mt-1 whitespace-pre-line">{notification.message}</p>
      <p className="mt-2 text-xs text-emerald-600">{notification.timestamp}</p>
    </div>
  );
}

export default function SmsTestPage() {
  const [selectedFarmerId, setSelectedFarmerId] = useState<string>("");

  const farmersQ = useQuery({
    queryKey: ["farmers"],
    queryFn: () => api.listFarmers(),
  });

  const notificationsQ = useQuery({
    queryKey: ["notifications", selectedFarmerId],
    queryFn: () => api.listNotifications(selectedFarmerId),
    enabled: !!selectedFarmerId,
  });

  const selectedFarmer = farmersQ.data?.find((f) => f.id === selectedFarmerId);

  return (
    <div className="min-h-screen bg-stone-100 p-6">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 rounded-[2rem] border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            🔧 SMS Test UI — Development Only
          </p>
          <p className="mt-1 text-xs text-amber-700">
            Use this page to preview what a farmer sees on their phone. Set SMS_DRY_RUN=true to test the full flow without sending real texts.
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Select a farmer
          </label>
          <select
            value={selectedFarmerId}
            onChange={(e) => setSelectedFarmerId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400"
          >
            <option value="">— Choose a farmer —</option>
            {farmersQ.data?.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.phone}){f.opted_out ? " [OPTED OUT]" : ""}
              </option>
            ))}
          </select>
        </div>

        {selectedFarmer && (
          <div className="rounded-[2rem] border border-slate-900 bg-slate-900 p-2">
            {/* Mock phone frame */}
            <div className="rounded-[1.5rem] bg-stone-100 overflow-hidden">
              {/* Phone header */}
              <div className="bg-emerald-600 px-4 py-2 text-center text-sm font-semibold text-white">
                Messages — {selectedFarmer.name}
              </div>

              {/* Message area */}
              <div className="p-4 space-y-3 min-h-[300px]">
                {!selectedFarmerId && (
                  <p className="text-sm text-slate-500 text-center">Select a farmer above</p>
                )}
                {notificationsQ.isLoading && (
                  <p className="text-sm text-slate-500 text-center">Loading messages…</p>
                )}
                {notificationsQ.isError && (
                  <p className="text-sm text-red-600 text-center">Failed to load messages.</p>
                )}
                {notificationsQ.data?.length === 0 && (
                  <p className="text-sm text-slate-500 text-center">No messages yet.</p>
                )}
                {notificationsQ.data?.map((n) => (
                  <SmsBubble key={n.id} notification={n} />
                ))}
              </div>

              {/* Mock input bar */}
              <div className="border-t border-slate-200 bg-white px-4 py-3">
                <p className="text-xs text-slate-400 text-center">
                  This is a read-only preview. Farmers respond by tapping the link in the SMS.
                </p>
              </div>
            </div>
          </div>
        )}

        {farmersQ.isLoading && <p className="text-sm text-slate-600">Loading farmers…</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add a production guard**

The spec says the page should be excluded from production builds. Add a check at the top of the component. Modify the page to wrap the entire export in an environment check:

Replace the `export default function SmsTestPage()` line with:

```typescript
export default function SmsTestPage() {
  // Dev-only: this page should not be accessible in production
  if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100 p-4">
        <p className="text-sm text-slate-600">This page is not available in production.</p>
      </div>
    );
  }
```

Since this is a client component, the `process.env.NODE_ENV` check will be inlined by Next.js at build time. When building for production, Next.js replaces `process.env.NODE_ENV` with `"production"`, and dead code elimination removes this branch. But for extra safety at runtime, the check is still there.

However — `"use client"` components run on both server and client. On the server, `process.env.NODE_ENV` works. On the client, Next.js inlines it at build time. So this guard works correctly.

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add app/sms-test/page.tsx
git commit -m "feat: add /sms-test mock inbox page for development"
```

---

## Task 12: Delete Old Farmer Page + Update Navbar

**Files:**
- Delete: `app/farmer/page.tsx`
- Modify: `components/navbar.tsx`

Remove the old hardcoded demo farmer page and add `/farmers` and `/register` links to the navbar.

- [ ] **Step 1: Delete the old farmer page**

```bash
rm app/farmer/page.tsx
```

- [ ] **Step 2: Update the navbar to link to new pages**

In `components/navbar.tsx`, add links for Farmers and Register. Replace the "Farmer View" link (line 24) with "Farmers" pointing to `/farmers`, and add a "Register" link. The nav section should become:

```tsx
        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/fertilizer" className="text-sm font-medium text-slate-700 hover:text-slate-950">
            Fertilizer
          </Link>
          <Link href="/driver" className="text-sm font-medium text-slate-700 hover:text-slate-950">
            Driver View
          </Link>
          <Link href="/farmers" className="text-sm font-medium text-slate-700 hover:text-slate-950">
            Farmers
          </Link>
          <Link href="/register" className="text-sm font-medium text-slate-700 hover:text-slate-950">
            Register
          </Link>
          <Link href="/hub" className="text-sm font-medium text-slate-700 hover:text-slate-950">
            Hub Dashboard
          </Link>
          <Link href="/routes" className="text-sm font-medium text-slate-700 hover:text-slate-950">
            Route Planning
          </Link>
        </nav>
```

- [ ] **Step 3: Verify the app still builds**

Run: `npx tsc --noEmit`
Expected: No type errors.

Run: `npx next build` (or just type-check if build is slow)
Expected: Build succeeds. The `/farmer/[id]` dynamic route is picked up, and the old `/farmer/page.tsx` is gone.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: remove demo farmer page, add /farmers and /register to navbar"
```

---

## Task 13: Full Flow Verification

This task verifies that all pieces work together end-to-end. No new code — just validation.

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All integration tests pass, including the 3 new test files.

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Manual smoke test checklist**

Start the dev server with `SMS_DRY_RUN=true` and verify:

1. **Register:** Visit `/register`, fill out form, submit → confirmation screen appears
2. **Farmer list:** Visit `/farmers` → see list with search, click into a farmer
3. **Farmer detail:** Visit `/farmer/[id]` → profile header, opportunities, responses, SMS history all load
4. **Edit profile:** Click "Edit" → change name → save → name updates
5. **Opt out toggle:** Click "Opt out of SMS" → badge updates
6. **Respond on behalf:** Click "Respond on behalf" → select type → submit → response appears in history
7. **Unsubscribe:** Visit `/unsubscribe?farmer=[id]` → confirm → confirmation screen
8. **Respond page:** Visit `/respond?route=[id]&farmer=[id]` → hub contact above form → submit → confirmation screen
9. **SMS test:** Visit `/sms-test` → select farmer → see messages in mock phone
10. **Navbar:** `/farmers` and `/register` links appear

- [ ] **Step 4: Commit (if any fixes were needed)**

```bash
git add -A
git commit -m "fix: address issues found in full flow verification"
```

(Only commit if changes were needed.)

---

## Self-Review Checklist

### 1. Spec Coverage

| Spec Section | Task |
|---|---|
| Component 1: Registration Page | Task 7 |
| Component 2: Farmer List | Task 8 |
| Component 3: Farmer Detail View (3a–3d) | Task 9 |
| Component 4: SMS Unsubscribe Link | Task 5 (formatRouteSmsMessage) + Task 6 |
| Component 5: /respond Enhancements | Task 10 |
| Component 6: API Client Updates | Task 1 |
| Component 7: SMS Test UI | Task 11 |
| GET /api/farmers | Task 2 |
| PATCH /api/farmers/[id] | Task 3 |
| GET /api/farmers/[id]/responses | Task 4 |
| SMS_DRY_RUN mode | Task 5 |
| Delete old /farmer page | Task 12 |
| Navbar update | Task 12 |

No gaps found.

### 2. Placeholder Scan

- No TBD, TODO, "implement later", or "fill in details" found
- No "add appropriate error handling" vagueness
- All code blocks contain complete implementation code
- All test files contain complete test code

### 3. Type Consistency

- `FarmerSummary`, `FarmerDetail`, `FarmerResponseItem` defined in Task 1 (`lib/api/client.ts`), used consistently in Tasks 8, 9
- `formatRouteSmsMessage` params updated in Task 5 with `farmerId` field, caller updated in `publish-route.ts`
- `PATCH /api/farmers/[id]` returns full farmer row from Supabase (which includes all `FarmerDetail` fields) — consistent with `FarmerDetail` type
- `GET /api/farmers/[id]/responses` return shape matches `FarmerResponseItem`
- `listFarmers`, `updateFarmer`, `listFarmerResponses` method signatures in client match the API endpoints