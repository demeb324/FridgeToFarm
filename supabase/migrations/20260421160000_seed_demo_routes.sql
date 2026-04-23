-- Seed two demo routes for the demo hub so /routes loads real data.

INSERT INTO routes (
  id, hub_id, title, start_lat, start_lng, end_lat, end_lng,
  route_polyline, start_time, end_time, notes, published
) VALUES
(
  'a0000001-0000-0000-0000-000000000001',
  '1e53e9e8-11db-4012-9451-f996632cd250',
  'Albuquerque Northbound Farm Run',
  35.0402, -106.609,
  35.687, -105.9378,
  'gxztEfauiSsn]wxMkzTf_BwcvAbs\fdLs|sC',
  '2026-06-01T09:00:00Z',
  '2026-06-01T17:00:00Z',
  'Sample New Mexico route from Albuquerque to Santa Fe with common waypoint landmarks along I-25.',
  false
),
(
  'a0000002-0000-0000-0000-000000000002',
  '1e53e9e8-11db-4012-9451-f996632cd250',
  'South Valley Market Connector',
  35.0965, -106.6703,
  34.9763, -106.7143,
  'cxeuEj`ajSfdB~HzJk}Ab}RjfJ',
  '2026-06-02T10:00:00Z',
  '2026-06-02T14:00:00Z',
  'Short urban New Mexico sample route with two pickup points between origin and destination.',
  false
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO route_assignments (route_id, driver_id, status) VALUES
('a0000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000001', 'assigned'),
('a0000002-0000-0000-0000-000000000002', 'd0000001-0000-0000-0000-000000000001', 'assigned')
ON CONFLICT (route_id, driver_id) DO NOTHING;
