## Problem Statement

Local farmers in rural areas struggle with reliable delivery of crops to markets. Trusted delivery hubs (food banks, logistics companies, government ag services) often lack available routes through rural regions, causing food distribution inequity. Farmers have no visibility into upcoming delivery routes near them, and hubs have no simple way to notify nearby farmers about planned deliveries. This creates a coordination gap: food that could reach schools, restaurants, and markets rots in the field while delivery trucks drive past farms that could fill them.

## Solution

FridgeToFarm is a platform that bridges this gap by connecting farmers to delivery hubs through a minimal, low-friction discovery loop:

1. **Hub operators** plan delivery routes using a GIS-like map interface, setting start/end points and route details.
2. **Farmers** register with just their name, phone number, and location — no login, no dashboard, no tech burden.
3. When a hub publishes a route, the system decodes the route polyline, identifies all farmers within 10 miles of any point along the route path, and sends them an SMS notification with the hub's contact information.
4. Farmers tap a link in the SMS to open a pre-filled response form on their phone, where they choose crop pickup, compost pickup, or both — no login required.
5. Farmers can also contact the hub directly (by phone or email) to coordinate — the platform facilitates discovery, not logistics.

This MVP is intentionally minimal: no authentication, no crop listings, no delivery tracking. The goal is to validate the core discovery loop: a hub publishes a route, and at least one farmer receives the notification and makes contact.

## User Stories

### Hub Operator Stories

- As a hub operator, I want to open the route planner and immediately see a map centered on my region, so that I can start planning a route without setup.
- As a hub operator, I want to click on the map (or search by address) to set a start point for my delivery route, so that I can define where my truck begins its journey.
- As a hub operator, I want to click on the map (or search by address) to set an end point for my delivery route, so that I can define where my truck ends its route.
- As a hub operator, I want the system to automatically generate a route path between my start and end points on the map, so that I can visualize the delivery path.
- As a hub operator, I want to enter a title, start time, end time, and notes for my route, so that farmers know when and why the truck is coming.
- As a hub operator, I want to click "Publish Route" and see a confirmation message stating how many farmers were notified, so that I know my route is active.
- As a hub operator, I want to view my previously created routes, so that I can reference past deliveries.

### Farmer Stories

- As a farmer, I want to open a simple registration page on my phone's browser, so that I can sign up to receive route notifications without downloading an app.
- As a farmer, I want to enter my name, phone number, and farm location (address or zip code), so that the system knows where my farm is and how to reach me.
- As a farmer, I want to optionally use my phone's GPS to auto-fill my farm location, so that I don't have to type my address on a small screen.
- As a farmer, I want to receive an SMS with a link when a delivery route is planned near my farm, so that I can tap it to opt in for crop pickup, compost pickup, or both.
- As a farmer, I want the SMS to include the hub's name, the delivery date, and the hub's phone number and/or email, so that I can optionally contact them directly.
- As a farmer outside the 10-mile range of a route's full path, I do not want to receive an SMS about that route, so that I only get relevant notifications.
- As a farmer, I want the response form to already show my name and the route details, so that I only have to choose my response type and optionally add notes.
- As a farmer, I want to see the hub's contact information on the response form, so that I can call or email them directly if I prefer.

## Implementation Decisions

### Architecture

- **Framework**: Next.js using App Router (React Server Components, route handlers in `app/api/`)
- **Database**: Supabase (PostgreSQL) for both development and production. Supabase provides hosted Postgres, auth, and a JS client library.
- **Deployment**: Vercel with serverless functions for API routes
- **No authentication**: Hub accounts are pre-seeded with no login. Farmer registration is anonymous. This is a prototype constraint, not a security model.
- **Project structure**: Greenfield Next.js App Router project — `app/` for routes and pages, `lib/` for business logic, `db/` for Supabase client and types.

### Proximity Matching

- Farmers are matched to routes using a **10-mile geospatial function**. When a hub publishes a route, the system decodes the Google Maps polyline into lat/lng points, loads all registered farmers into memory, and checks each farmer against every polyline point using the geospatial function. A farm within 10 miles of **any point along the route path** is notified.
- This approach covers the full route — not just start/end points — ensuring farms along the middle of the route are notified.
- The encoded polyline is already returned by the Google Maps Routes API when creating the route, so no additional API calls are needed.
- We will use google.maps.geometry.encoding.decodePath() to decode the polyline before sending it to the backend for persistence.


### Map & Geocoding

- **Map widget**: `@vis.gl/react-google-maps` (v1.8.3) for the hub route planner. Hub operators click or search to set start/end points.
- **Route generation**: Google Maps Routes API generates the route path (polyline) between start and end points for visual display on the map.
- **Geocoding**: Google Maps Geocoding API converts farmer addresses/zip codes to lat/lng coordinates during registration. Browser Geolocation API is offered as an optional auto-fill.

### SMS Notifications

- **Provider**: Twilio API for outbound SMS only (no exposed webhook endpoints). Twilio integration is backend logic triggered when a route is published.
- **Format**: `[Hub Name] has a delivery route near you on [Date]. Tap to respond: [URL]. Questions? Contact [phone/email].`
- **Response URL**: Each SMS includes a route-specific link: `{BASE_URL}/respond?route={route_id}&farmer={farmer_id}`. The respond page is a pre-filled form showing the farmer's name, route details (hub name, date, times, notes), and hub contact info. The farmer selects a response type (crop pickup, compost pickup, or both) and optionally adds notes, then submits.
- **Error handling**: If an individual SMS send fails, the error is logged but does not block remaining notifications in the batch.

### Data Model

**Farmers**
| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| name | text | Farmer's name |
| phone | text | Unique, E.164 format |
| latitude | float8 | Geocoded from address |
| longitude | float8 | Geocoded from address |
| address_text | text | Raw address or zip entered by farmer |
| opted_out | boolean | Default false, managed via response form or direct request |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**Hubs**
| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| name | text | Hub display name |
| phone | text | Hub contact phone |
| email | text | Hub contact email |
| created_at | timestamptz | |

**Routes**
| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| hub_id | uuid | FK → Hubs.id |
| title | text | Route title |
| start_lat | float8 | Start point latitude |
| start_lng | float8 | Start point longitude |
| end_lat | float8 | End point latitude |
| end_lng | float8 | End point longitude |
| route_polyline | text | Encoded polyline from Google Routes API |
| start_time | timestamptz | Route start date/time |
| end_time | timestamptz | Route end date/time |
| notes | text | Optional hub notes |
| published | boolean | Default false |
| created_at | timestamptz | |

**NotificationLog**
| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| route_id | uuid | FK → Routes.id |
| farmer_id | uuid | FK → Farmers.id |
| status | text | `sent` / `failed` / `opted_out` |
| twilio_sid | text | Twilio message SID |
| error_message | text | Null if successful |
| created_at | timestamptz | |

**RouteResponses**
| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| route_id | uuid | FK → Routes.id |
| farmer_id | uuid | FK → Farmers.id |
| response_type | text | `crop_pickup` / `compost_pickup` / `both` |
| notes | text | Optional — farmer details (what crops, how much compost, etc.) |
| status | text | `pending` / `confirmed` / `cancelled` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

- Hub phone and email are stored on the Hub record and included in SMS messages so farmers contact the hub directly.
- RouteResponses tracks farmer opt-in per route. A farmer taps the link in the SMS, fills out the pre-filled response form (choosing crop pickup, compost pickup, or both), and submits. The form submission creates a RouteResponse row. Hubs view opted-in farmers per route to coordinate logistics.

### Pre-Seed Data

- At least one hub account seeded in the database for demonstration (e.g., "Roadrunner Food Bank" with test phone/email).
- No seed farmers — they register themselves via the web form.

### API Design

- `POST /api/farmers` — Register or update a farmer (upsert on phone number)
- `POST /api/routes` — Create a new route (hub operator)
- `PATCH /api/routes/:id/publish` — Publish a route, trigger proximity matching and SMS notifications
- `GET /api/routes` — List routes for the hub
- `GET /respond` — Farmer response form page (pre-filled via route_id + farmer_id query params). Shows route details, farmer name, hub contact info. No auth required.
- `POST /api/responses` — Submit a route response (creates RouteResponse row)

## Testing Decisions

- **No automated tests for the MVP prototype.** The success criteria are manual validation: (1) a hub can create and publish a route, and (2) at least one farmer receives an SMS with a valid response form link.
- Testing will be performed manually during development and via the acceptance criteria defined in this document.
- Post-prototype, test coverage should prioritize the **Proximity Matching Module** (Haversine distance calculations, polyline decoding, point-to-route matching, edge cases like null coordinates) and the **SMS Module** (message formatting, error handling, link generation).

## Out of Scope

These items are explicitly excluded from the MVP prototype:

- **Authentication** — No login system for farmers or hubs. Hub accounts are pre-seeded.
- **Farmer crop details / listings** — Farmers contact hubs directly; no crop database.
- **Receipt generation** — No delivery receipt system.
- **Delivery sign-off** — No digital signature or confirmation workflow.
- **Quality/inspection tracking** — No condition reporting at delivery.
- **Audit trails** — No activity logging beyond the NotificationLog table.
- **Contract management** — No agreement/terms system.
- **Admin panel** — Hub accounts are pre-seeded, no admin UI.
- **Automated tests** — Manual validation only for the prototype.
- **PostGIS** — Using Haversine formula with lat/lng columns instead of PostGIS geo types for simplicity.
- **Dashboard/analytics** — No reporting interface for hubs or farmers.

## Further Notes

### Design Principles

- **Farmer-first minimalism**: The farmer's entire interaction is: register once, receive SMS, tap link, choose response type. No account, no dashboard, no app download.
- **Discovery over logistics**: The platform connects farmers to hubs. Actual pickup coordination happens off-platform (phone/email).
- **Prototype validation**: This MVP exists to answer one question: "If a hub publishes a route, will a farmer receive the notification and opt in via the response form?" Everything else is deferred.

### Phase 2 Considerations (Not in Scope, but Noted)

The following features are anticipated for post-MVP iterations and should not be blocked by MVP architecture decisions:

- OAuth (Google/Microsoft) for hub operators
- Magic email links as alternative auth
- Farmer account management and notification preferences
- Receipt and record keeping system
- Route transparency dashboard for farmers
- Farmer crop availability listings
- Audit trails and activity logging
- Vendor reputation and whitelist system
- Contract management (one-click term acceptance)
- Quality tracking (thumbs up/down at delivery)

### Technical Risks

- **Twilio costs**: Each SMS costs money. Monitor usage during testing to avoid unexpected bills during prototype validation.
- **Google Maps API costs**: Route generation and geocoding both incur per-request charges. Consider caching geocoding results for repeated addresses.
