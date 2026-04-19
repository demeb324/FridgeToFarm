# FridgeToFarm — Product Requirements Document

## Problem Statement

Local farmers often struggle with reliable delivery of crops to markets. Trusted delivery hubs often do not have available routes through rural regions, causing food distribution inequity. Farmers lack visibility into available routes, and hubs lack a simple way to notify nearby farmers about upcoming deliveries.

## Proposed Solution

A platform connecting farmers to delivery hubs (e.g., Roadrunner Food Bank). Delivery hubs plan an initial round-trip delivery route with a larger entity (e.g., government services) through rural areas. On the return trip, delivery trucks pick up food waste for composting by farmers. Local farmers in proximity receive notifications and can coordinate with the delivery hub to have their goods picked up and delivered to target destinations (schools, restaurants, markets).

The platform integrates with farmers' existing systems through custom development. For farmers, interactions are minimal and low-tech (e.g., SMS). For delivery hubs, delivery planning uses a GIS-like experience.

---

## Target Users

### Primary: Small Family Farmer (MVP)

- 1–5 people, sells at local markets
- Low tech literacy; primary device is a basic phone
- Needs minimal interaction — discover opportunities, contact hub, done
- Does not want dashboards or data tools

### Secondary: Mid-Size Organic Operation (Post-MVP)

- 10–50 acres, some existing systems (QuickBooks, spreadsheets)
- Sells to restaurants and schools, moderate tech comfort
- May want crop availability listings, delivery history, analytics

### Hub Operator (Multiple Types)

- **Food banks** (e.g., Roadrunner Food Bank) — existing routes, adding farm pickups
- **Logistics companies** — private delivery serving rural routes
- **Government ag services** — state/county programs with delivery infrastructure
- Comfortable with web applications; needs GIS-like route planning
- Manages routes, reviews farmer responses, coordinates pickups

---

## MVP (Prototype)

### Overview

The MVP is a **prototype** that validates the core discovery loop: a hub creates a route, and nearby farmers receive an SMS notification with enough information to coordinate directly.

**No authentication is included in the prototype.** Hub accounts are pre-seeded; farmers register via a simple web form.

### Functional Requirements

#### FR-1: Hub Route Planner

A hub operator creates a delivery route by:

1. Setting a **start point** and **end point** on a map widget (Google Maps Routes API)
2. The system generates a route path between the two points
3. Adding **title**, **start time**, **end time**, and **notes**
4. Publishing the route, which triggers farmer notifications

**Acceptance criteria:**
- Hub operator can place two points on a map and see a generated route path
- Route metadata (title, times, notes) can be entered and saved
- Route is persisted and viewable after creation

#### FR-2: Farmer SMS Notifications

When a hub publishes a route:

1. The system identifies all registered farms within **10 miles of any point along the route** (by decoding the route polyline and checking Haversine distance from each farm to each polyline point)
2. Each matching farmer receives an SMS (via Twilio) containing:
   - Hub name
   - Date of the route
   - Hub contact information (phone and/or email)
3. The farmer contacts the hub **directly outside the platform** to coordinate

**SMS format:**
> `[Hub Name] has a delivery route near you on [Date]. Contact [phone/email] to coordinate pickup.`

**Acceptance criteria:**
- Farmers within 10 miles of the route path receive an SMS
- SMS contains hub name, date, and contact details
- Farmers outside the 10-mile range of the route path do not receive the SMS

#### FR-3: Farmer Self-Registration

A simple web form for farmers to register:

1. **Name** — farmer's name
2. **Phone number** — for SMS notifications
3. **Farm location** — address or zip code, geocoded by the system (browser geolocation if available, manual entry otherwise)

No authentication, no account management. Registration adds the farmer to the notification pool.

**Acceptance criteria:**
- Farmer can submit name, phone, and location via a web form
- Location is geocoded and stored as latitude/longitude
- Duplicate phone numbers are handled gracefully (update existing record)

#### FR-4: Pre-Seeded Hub Accounts

Hub operator accounts are pre-seeded in the system. No hub self-registration or authentication in MVP. The prototype includes one or two test hub accounts for demonstration.

**Acceptance criteria:**
- At least one hub account is pre-seeded and can access the route planner
- Hub can create, view, and publish routes

### Out of Scope for MVP

- **Authentication** — No login system for farmers or hubs (prototype)
- **Farmer web form for crop details** — Farmers contact the hub directly by phone/email
- **Receipt generation** — No delivery receipt system
- **Delivery sign-off** — No digital signature or confirmation workflow
- **Quality/inspection tracking** — No condition reporting at delivery
- **Audit trails** — No activity logging beyond route creation and SMS dispatch
- **Contract management** — No agreement/terms system
- **Admin panel** — Hub accounts are pre-seeded, no admin UI
- **Return-trip compost pickup** — Logistics for return trips not included

### Success Criteria

The prototype validates the core discovery loop if:

1. A hub operator can create a route and publish it → ✅ at least 1 route created
2. At least 1 registered farmer receives the SMS notification → ✅ at least 1 farmer notified

---

## Technical Constraints

| Component | Technology |
|---|---|
| Frontend & Backend | Next.js |
| Database | Supabase (PostgreSQL) |
| Mapping & Routing | Google Maps Routes API |
| Maps Library | @vis.gl/react-google-maps |
| SMS Notifications | Twilio |
| Geocoding | Google Maps Geocoding API |
| Hosting | Vercel |

---

## User Flows

### Hub Operator: Create Route

1. Open route planner (pre-seeded hub, no login)
2. Search/type or click to set start point on map
3. Search/type or click to set end point on map
4. System generates route path between points
5. Enter title, start time, end time, and notes
6. Click "Publish Route"
7. System identifies farmers within 10 miles of any point along the route path
8. System sends SMS to matching farmers
9. Confirmation: "Route published. X farmers notified."

### Farmer: Register & Receive Notification

1. Open farmer registration page
2. Enter name, phone number, farm location (address/zip or use current location)
3. Submit registration
4. (Later) Receive SMS: `[Hub Name] has a delivery route near you on [Date]. Contact [phone/email] to coordinate pickup.`
5. Contact hub directly via phone/email to arrange pickup

---

## Phase 2 Overview

The following features are planned for post-MVP iterations. They are included here to signal product intent, but are not specified in detail.

### Distribution & Logistics

- **Receipts & Record Keeping** — Simple receipt format per delivery (due date, recipient, items by weight). Signing off and inspection process. Labeling system for tracking.
- **Route Tracking & Transparency** — Hub and route visibility for all parties. Farmers can see upcoming routes and express interest.
- **Compost Return-Trip Pickup** — Delivery trucks pick up food waste on return trips for composting by farmers.
- **Farmer Crop Availability Listing** — Farmers can list available crops (type, quantity, harvest date) so hubs can plan routes around supply.

### Accountability & Trust

- **Audit Trails** — Full activity log: route creation, farmer responses, pickup confirmations, delivery sign-offs.
- **Vendor Reputation** — Admin-curated whitelist of approved distribution vendors. Reputation system considered for later.
- **Contracts** — Simple one-click term acceptance when a farmer commits to a delivery.
- **Quality Tracking** — Simple thumbs up/down quality flag at delivery, with optional notes.

### Authentication

- **OAuth** (Google/Microsoft) for hub operators
- **Magic email links** as alternative auth method
- **Farmer account management** — profile, notification preferences, farm details

### User Experience

- **Phone call support** — Hub phone number included in notifications for farmers who prefer phone
- **Simple, actionable receipts** — Receipts and confirmations that are clear and immediately useful
- **Data dashboards** — Not a core interest point for primary persona; may serve secondary persona

### Organic & Yield (Future Consideration)

- Organic produce yield considerations and logistics
- Nutrient information tracking

---

*Raw brainstorming notes preserved in [`docs/raw-notes.md`](./raw-notes.md).*
