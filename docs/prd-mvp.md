## Problem Statement

Local farmers in rural areas struggle with reliable delivery of crops to markets. Trusted delivery hubs (food banks, logistics companies, government ag services) often lack available routes through rural regions, causing food distribution inequity. Farmers have no visibility into upcoming delivery routes near them, and hubs have no simple way to notify nearby farmers about planned deliveries. This creates a coordination gap: food that could reach schools, restaurants, and markets rots in the field while delivery trucks drive past farms that could fill them.

## Solution

FridgeToFarm is a platform that bridges this gap by connecting farmers to delivery hubs through a minimal, low-friction discovery loop:

1. **Hub operators** plan delivery routes using a GIS-like map interface, setting start/end points and route details.
2. **Farmers** register with just their name, phone number, and location — no login, no dashboard, no tech burden.
3. When a hub publishes a route, the system automatically identifies farmers within a 10-mile radius of the route's start or end points and sends them an SMS notification with the hub's contact information.
4. Farmers contact the hub directly (by phone or email) to coordinate pickup — the platform facilitates discovery, not logistics.

This MVP is intentionally minimal: no authentication, no crop listings, no delivery tracking. The goal is to validate the core discovery loop: a hub publishes a route, and at least one farmer receives the notification and makes contact.

## User Stories

### Hub Operator Stories

1. As a hub operator, I want to open the route planner and immediately see a map centered on my region, so that I can start planning a route without setup.
2. As a hub operator, I want to click on the map (or search by address) to set a start point for my delivery route, so that I can define where my truck begins its journey.
3. As a hub operator, I want to click on the map (or search by address) to set an end point for my delivery route, so that I can define where my truck ends its route.
4. As a hub operator, I want the system to automatically generate a route path between my start and end points on the map, so that I can visualize the delivery path.
5. As a hub operator, I want to enter a title, start time, end time, and notes for my route, so that farmers know when and why the truck is coming.
6. As a hub operator, I want to click "Publish Route" and see a confirmation message stating how many farmers were notified, so that I know my route is active.
7. As a hub operator, I want to view my previously created routes, so that I can reference past deliveries.
8. As a hub operator (pre-seeded account), I want to access the route planner without creating an account or logging in, so that I can demonstrate the prototype quickly.

### Farmer Stories

9. As a farmer, I want to open a simple registration page on my phone's browser, so that I can sign up to receive route notifications without downloading an app.
10. As a farmer, I want to enter my name, phone number, and farm location (address or zip code), so that the system knows where my farm is and how to reach me.
11. As a farmer, I want to optionally use my phone's GPS to auto-fill my farm location, so that I don't have to type my address on a small screen.
12. As a farmer, I want to receive an SMS message when a delivery route is planned near my farm, so that I can coordinate directly with the hub.
13. As a farmer, I want the SMS to include the hub's name, the delivery date, and the hub's phone number and/or email, so that I can contact them directly without using the platform.
14. As a farmer, I want to reply STOP to an SMS to unsubscribe from future notifications, so that I can opt out if I no longer want to receive messages.
15. As a farmer, I want to reply UNSTOP to resubscribe to notifications, so that I can rejoin if I opted out by mistake.
16. As a farmer who registers with the same phone number, I want my existing record to be updated rather than duplicated, so that my information stays current.
17. As a farmer outside the 10-mile radius of a route, I do not want to receive an SMS about that route, so that I only get relevant notifications.

### SMS/System Stories

18. As the system, I want to geocode farmer addresses and zip codes into latitude/longitude coordinates, so that I can perform proximity calculations.
19. As the system, I want to calculate which registered farms fall within a 10-mile radius of a route's start point or end point, so that I can target the right farmers for notification.
20. As the system, I want to send a formatted SMS via Twilio to each matching farmer, so that notifications are delivered reliably.
21. As the system, I want to process STOP/UNSTOP replies from farmers via Twilio webhook, so that opt-out preferences are respected in real time.
22. As the system, I want to respect farmer opt-out status when sending notifications, so that unsubscribed farmers never receive unwanted messages.
23. As the system, I want to pre-seed at least one hub account in the database, so that the prototype has demo data available immediately.

### Edge Case Stories

24. As a farmer with an invalid or unmappable address, I want to see a clear error message, so that I know my registration didn't work and I can try again.
25. As a farmer registering from a location that cannot be geocoded, I want helpful guidance, so that I can provide a valid address or zip code.
26. As a hub operator, if no farmers are within 10 miles of my route, I want to see a message stating "0 farmers notified," so that I know the route is published but no one was reached.
27. As a farmer who has opted out (STOP), I want confirmation that I will no longer receive messages, so that I trust the opt-out mechanism works.
28. As the system, if Twilio SMS delivery fails for a specific number, I want to log the failure without blocking the rest of the notifications, so that one bad phone number doesn't stop all SMS sends.

## Implementation Decisions

### Architecture

- **Framework**: Next.js using App Router (React Server Components, route handlers in `app/api/`)
- **Database**: PostgreSQL (production on Vercel Postgres) / SQLite (local development), accessed via Kysely type-safe query builder
- **Deployment**: Vercel with serverless functions for API routes
- **No authentication**: Hub accounts are pre-seeded with no login. Farmer registration is anonymous. This is a prototype constraint, not a security model.
- **Project structure**: Greenfield Next.js App Router project — `app/` for routes and pages, `lib/` for business logic, `db/` for database schema and migrations.

### Proximity Matching

- Farmers are matched to routes using a **10-mile radius around the route's start point AND end point** (not the route polyline). This is simpler to implement and sufficient for prototype validation. A farm within 10 miles of EITHER the start or end point is notified.
- Distance calculation uses the **Haversine formula** applied to geocoded lat/lng coordinates stored in the database. No PostGIS extension required at this stage.

### Map & Geocoding

- **Map widget**: Google Maps React (`@react-google-maps/api`) for the hub route planner. Hub operators click or search to set start/end points.
- **Route generation**: Google Maps Routes API generates the route path (polyline) between start and end points for visual display on the map.
- **Geocoding**: Google Maps Geocoding API converts farmer addresses/zip codes to lat/lng coordinates during registration. Browser Geolocation API is offered as an optional auto-fill.

### SMS Notifications

- **Provider**: Twilio API for all SMS sending and receiving.
- **Format**: `[Hub Name] has a delivery route near you on [Date]. Contact [phone/email] to coordinate pickup.`
- **Opt-out**: Twilio STOP/UNSTOP handling via webhook endpoint. Farmers can text STOP to unsubscribe and UNSTOP to resubscribe. This is required for TCPA compliance.
- **Error handling**: If an individual SMS send fails, the error is logged but does not block remaining notifications in the batch.

### Data Model

- **Farmers table**: id, name, phone (unique), latitude, longitude, address_text, opted_out (boolean, default false), created_at, updated_at
- **Hubs table**: id, name, phone, email, created_at
- **Routes table**: id, hub_id (FK), title, start_lat, start_lng, end_lat, end_lng, route_polyline (text, encoded polyline), start_time, end_time, notes, published (boolean), created_at
- **NotificationLog table**: id, route_id (FK), farmer_id (FK), status (sent/failed/opted_out), twilio_sid, error_message, created_at

- Hub phone and email are stored on the Hub record and included in SMS messages so farmers contact the hub directly.

### Pre-Seed Data

- At least one hub account seeded in the database for demonstration (e.g., "Roadrunner Food Bank" with test phone/email).
- No seed farmers — they register themselves via the web form.

### API Design

- `POST /api/farmers` — Register or update a farmer (upsert on phone number)
- `POST /api/routes` — Create a new route (hub operator)
- `PATCH /api/routes/:id/publish` — Publish a route, trigger proximity matching and SMS notifications
- `GET /api/routes` — List routes for the hub
- `POST /api/twilio/sms` — Twilio webhook for incoming SMS (STOP/UNSTOP handling)
- `GET /api/twilio/status` — Twilio status callback webhook for delivery receipts

## Testing Decisions

- **No automated tests for the MVP prototype.** The success criteria are manual validation: (1) a hub can create and publish a route, and (2) at least one farmer receives an SMS notification.
- Testing will be performed manually during development and via the acceptance criteria defined in the spec.
- Post-prototype, test coverage should prioritize the **Proximity Matching Module** (Haversine distance calculations, radius filtering, edge cases like null coordinates) and the **SMS Module** (message formatting, opt-out compliance, error handling).

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
- **Return-trip compost pickup** — Logistics for return trips not included.
- **Route polyline proximity matching** — Using start/end point radius instead of full polyline buffer for simplicity.
- **Automated tests** — Manual validation only for the prototype.
- **PostGIS** — Using Haversine formula with lat/lng columns instead of PostGIS geo types for simplicity.
- **Dashboard/analytics** — No reporting interface for hubs or farmers.

## Further Notes

### Design Principles

- **Farmer-first minimalism**: The farmer's entire interaction is: register once, receive SMS, call the hub. No account, no dashboard, no app download.
- **Discovery over logistics**: The platform connects farmers to hubs. Actual pickup coordination happens off-platform (phone/email).
- **Prototype validation**: This MVP exists to answer one question: "If a hub publishes a route, will a farmer receive the notification and make contact?" Everything else is deferred.

### Phase 2 Considerations (Not in Scope, but Noted)

The following features are anticipated for post-MVP iterations and should not be blocked by MVP architecture decisions:

- OAuth (Google/Microsoft) for hub operators
- Magic email links as alternative auth
- Farmer account management and notification preferences
- Receipt and record keeping system
- Route transparency dashboard for farmers
- Compost return-trip pickup logistics
- Farmer crop availability listings
- Audit trails and activity logging
- Vendor reputation and whitelist system
- Contract management (one-click term acceptance)
- Quality tracking (thumbs up/down at delivery)
- Full polyline buffer proximity matching (upgrade from start/end point radius)

### Technical Risks

- **Twilio costs**: Each SMS costs money. Monitor usage during testing to avoid unexpected bills during prototype validation.
- **Google Maps API costs**: Route generation and geocoding both incur per-request charges. Consider caching geocoding results for repeated addresses.
- **Vercel serverless timeout**: SMS notification batches for large farmer populations could exceed Vercel's 10-second function timeout. If this occurs, batch processing with a queue (e.g., Vercel Cron or Inngest) may be needed.
- **SQLite → PostgreSQL migration**: The Kysely dialect difference between SQLite (dev) and PostgreSQL (prod) requires careful handling of geo queries and type differences. Migration scripts must be tested.
