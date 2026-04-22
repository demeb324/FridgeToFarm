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