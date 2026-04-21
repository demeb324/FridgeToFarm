-- Migration: drivers, route_assignments, find_routes_near_farmer
-- Created: 2026-04-21

-- =============================================================================
-- Drivers
-- =============================================================================
CREATE TABLE IF NOT EXISTS drivers (
  id         uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hub_id     uuid        NOT NULL REFERENCES hubs(id) ON DELETE RESTRICT,
  first_name text        NOT NULL,
  last_name  text        NOT NULL,
  phone      text        NOT NULL UNIQUE,
  vehicle    text,
  zone       text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_drivers_hub_id ON drivers (hub_id);

-- =============================================================================
-- Route Assignments (join table: drivers <-> routes)
-- =============================================================================
CREATE TABLE IF NOT EXISTS route_assignments (
  id         uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id   uuid        NOT NULL REFERENCES routes(id)  ON DELETE CASCADE,
  driver_id  uuid        NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
  status     text        NOT NULL DEFAULT 'assigned'
             CHECK (status IN ('assigned','started','in_progress','completed','cancelled')),
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (route_id, driver_id)
);
CREATE INDEX IF NOT EXISTS idx_route_assignments_driver_id ON route_assignments (driver_id);
CREATE INDEX IF NOT EXISTS idx_route_assignments_route_id  ON route_assignments (route_id);

-- =============================================================================
-- Find published routes near a farmer, excluding already-responded routes
-- =============================================================================
CREATE OR REPLACE FUNCTION find_routes_near_farmer(
  farmer_id_in uuid,
  radius_miles float8 DEFAULT 10
) RETURNS TABLE (
  route_id           uuid,
  route_title        text,
  hub_id             uuid,
  hub_name           text,
  start_time         timestamptz,
  end_time           timestamptz,
  start_lat          float8,
  start_lng          float8,
  end_lat            float8,
  end_lng            float8,
  notes              text,
  min_distance_miles float8
)
LANGUAGE plpgsql
AS $$
DECLARE
  f_lat float8;
  f_lng float8;
BEGIN
  SELECT latitude, longitude INTO f_lat, f_lng FROM farmers WHERE id = farmer_id_in;
  IF f_lat IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.title,
    h.id,
    h.name,
    r.start_time,
    r.end_time,
    r.start_lat,
    r.start_lng,
    r.end_lat,
    r.end_lng,
    r.notes,
    LEAST(
      haversine_miles(f_lat, f_lng, r.start_lat, r.start_lng),
      haversine_miles(f_lat, f_lng, r.end_lat,   r.end_lng)
    ) AS min_distance_miles
  FROM routes r
  JOIN hubs   h ON h.id = r.hub_id
  WHERE r.published = true
    AND NOT EXISTS (
      SELECT 1 FROM route_responses rr
      WHERE rr.route_id = r.id AND rr.farmer_id = farmer_id_in
    )
    AND LEAST(
      haversine_miles(f_lat, f_lng, r.start_lat, r.start_lng),
      haversine_miles(f_lat, f_lng, r.end_lat,   r.end_lng)
    ) <= radius_miles
  ORDER BY min_distance_miles ASC;
END;
$$;

-- =============================================================================
-- Seed: one hub + two drivers
-- =============================================================================
INSERT INTO hubs (id, name, phone, email)
VALUES ('1e53e9e8-11db-4012-9451-f996632cd250',
        'Boise Distribution Hub',
        '+15052267853',
        'ops@boisedistro.example.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO drivers (id, hub_id, first_name, last_name, phone, vehicle, zone, avatar_url)
VALUES
  ('d0000001-0000-0000-0000-000000000001',
   '1e53e9e8-11db-4012-9451-f996632cd250',
   'Elena', 'Martinez', '+15055550142',
   'Box Truck 12', 'Boise North',
   'https://i.pravatar.cc/120?img=32'),
  ('d0000002-0000-0000-0000-000000000002',
   '1e53e9e8-11db-4012-9451-f996632cd250',
   'Marcus', 'Hill', '+15055550160',
   'Flatbed 7', 'Boise South',
   'https://i.pravatar.cc/120?img=12')
ON CONFLICT (id) DO NOTHING;
