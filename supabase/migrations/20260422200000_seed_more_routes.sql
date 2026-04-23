-- Seed 8 more demo routes for the demo hub.

INSERT INTO routes (id, hub_id, title, start_address, end_address, start_lat, start_lng, end_lat, end_lng, route_polyline, start_time, end_time, notes, published) VALUES
('a0000003-0000-0000-0000-000000000003', '1e53e9e8-11db-4012-9451-f996632cd250', 'Bernalillo Express Run', '400 Marquette Ave NW, Albuquerque, NM 87102', '1 Bernalillo Town Center, Bernalillo, NM 87004', 35.0842, -106.6513, 35.1062, -106.5528, 'gxztEfauiSsn]wxMkzTf_BwcvAbsfdLs|sC', '2026-06-03T08:00:00Z', '2026-06-03T12:00:00Z', 'Downtown pickup then out to Bernalillo Town Center for distribution.', false),
('a0000004-0000-0000-0000-000000000004', '1e53e9e8-11db-4012-9451-f996632cd250', 'East Mountains Organics Loop', '8000 Paseo del Norte NE, Albuquerque, NM 87113', '4601 Yale Blvd SE, Albuquerque, NM 87108', 35.1628, -106.5283, 35.0420, -106.6012, 'cxeuEj`ajSfdB~HzJk}Ab}RjfJ', '2026-06-04T07:30:00Z', '2026-06-04T11:30:00Z', 'Morning run from Northeast heights through to airport area farms.', false),
('a0000005-0000-0000-0000-000000000005', '1e53e9e8-11db-4012-9451-f996632cd250', 'Rio Rancho Pickup Circuit', '1500 Rio Rancho Dr, Rio Rancho, NM 87124', '2100 Louisiana Blvd NE, Albuquerque, NM 87110', 35.1431, -106.6342, 35.1123, -106.5723, 'ixe{Fdu`jSq]zxN}Ab}RjfJ', '2026-06-05T09:00:00Z', '2026-06-05T15:00:00Z', 'Extended half-day route covering Rio Rancho pickup points then back to Uptown hub.', false),
('a0000006-0000-0000-0000-000000000006', '1e53e9e8-11db-4012-9451-f996632cd250', 'Downtown ABQ Fresh Connect', '500 Copper Ave NW, Albuquerque, NM 87102', '320 Carlisle Blvd SE, Albuquerque, NM 87106', 35.0828, -106.6516, 35.0673, -106.5991, 'awe{Gftv_SsdQ~mKzTj_AwcuAns', '2026-06-06T10:00:00Z', '2026-06-06T13:00:00Z', 'Short urban loop through downtown to Nob Hill neighborhood.', false),
('a0000007-0000-0000-0000-000000000007', '1e53e9e8-11db-4012-9451-f996632cd250', 'Corrales Valley Harvest Route', '4500 Corrales Rd, Corrales, NM 87048', '5600 Eubank Blvd NE, Albuquerque, NM 87111', 35.2348, -106.5352, 35.1329, -106.5231, 'bze{IbruaTsmW~zMgzAbj~J', '2026-06-08T06:00:00Z', '2026-06-09T18:00:00Z', 'Two-day multi-stop route from Corrales agricultural area northeast to farNE Heights.', false),
('a0000008-0000-0000-0000-000000000008', '1e53e9e8-11db-4012-9451-f996632cd250', 'North Valley Farm-to-Market', '7001 Central Ave NW, Albuquerque, NM 87121', '400 Marquette Ave NW, Albuquerque, NM 87102', 35.0288, -106.7128, 35.0842, -106.6513, 'dce{E`{_SseQvwMkzTf_BwcvAbs', '2026-06-09T08:00:00Z', '2026-06-09T14:00:00Z', 'Westside collection to downtown market delivery.', false),
('a0000009-0000-0000-0000-000000000009', '1e53e9e8-11db-4012-9451-f996632cd250', 'Westside Groceries Express', '1500 Rio Bravo Blvd SW, Albuquerque, NM 87105', '7001 Central Ave NW, Albuquerque, NM 87121', 35.0393, -106.6817, 35.0288, -106.7128, 'cxeuEj`ajSsdBfzJk}Ab}RjfJ', '2026-06-10T11:00:00Z', '2026-06-10T15:00:00Z', 'Afternoon run from South Valley to Westside distribution points.', false),
('a0000010-0000-0000-0000-000000000010', '1e53e9e8-11db-4012-9451-f996632cd250', 'Lovelace Hospital Food Drive', '4601 Yale Blvd SE, Albuquerque, NM 87108', '2100 Louisiana Blvd NE, Albuquerque, NM 87110', 35.0420, -106.6012, 35.1123, -106.5723, 'gxztEfauiSsn]wxMkzTf_BwcvAbs', '2026-06-11T14:00:00Z', '2026-06-11T18:00:00Z', 'Afternoon hospital food delivery from airport area to Uptown medical district.', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO route_stops (id, route_id, order_index, address, name, latitude, longitude) VALUES
(gen_random_uuid(), 'a0000003-0000-0000-0000-000000000003', 0, '3501 Rio Grande Blvd NW, Albuquerque, NM 87107', 'ABQ Harvest Co-op', 35.1023, -106.6947),
(gen_random_uuid(), 'a0000004-0000-0000-0000-000000000004', 0, '9500 Lomas Blvd NE, Albuquerque, NM 87112', 'Duke City Fresh', 35.0784, -106.5311),
(gen_random_uuid(), 'a0000005-0000-0000-0000-000000000005', 0, '10000 Sage Rd SW, Albuquerque, NM 87121', 'West Mesa Farm', 35.0556, -106.7118),
(gen_random_uuid(), 'a0000005-0000-0000-0000-000000000005', 1, '3500 Atrisco Vista Blvd NW, Albuquerque, NM 87120', 'Atrisco Gardens', 35.0721, -106.7412),
(gen_random_uuid(), 'a0000006-0000-0000-0000-000000000006', 0, '1200 Lomas Blvd NE, Albuquerque, NM 87106', 'Nob Hill Farmers', 35.0736, -106.6193),
(gen_random_uuid(), 'a0000007-0000-0000-0000-000000000007', 0, '10400 2nd St, Albuquerque, NM 87113', 'North Valley Produce', 35.1902, -106.5973),
(gen_random_uuid(), 'a0000008-0000-0000-0000-000000000008', 0, '4204 Rio Grande Blvd NW, Albuquerque, NM 87107', 'Los Ranchos Market', 35.1312, -106.6915)
ON CONFLICT (route_id, order_index) DO NOTHING;

INSERT INTO route_assignments (id, route_id, driver_id, status, notes, created_at, updated_at) VALUES
(gen_random_uuid(), 'a0000003-0000-0000-0000-000000000003', 'd0000001-0000-0000-0000-000000000001', 'assigned', 'Morning downtown to Bernalillo', now(), now()),
(gen_random_uuid(), 'a0000004-0000-0000-0000-000000000004', 'd0000002-0000-0000-0000-000000000002', 'assigned', 'Morning East Mountains run', now(), now()),
(gen_random_uuid(), 'a0000005-0000-0000-0000-000000000005', 'd0000001-0000-0000-0000-000000000001', 'assigned', 'Full day Rio Rancho circuit', now(), now()),
(gen_random_uuid(), 'a0000006-0000-0000-0000-000000000006', 'd0000002-0000-0000-0000-000000000002', 'assigned', 'Short downtown Nob Hill loop', now(), now()),
(gen_random_uuid(), 'a0000007-0000-0000-0000-000000000007', 'd0000001-0000-0000-0000-000000000001', 'assigned', 'Two-day Corrales to NE Heights', now(), now()),
(gen_random_uuid(), 'a0000008-0000-0000-0000-000000000008', 'd0000002-0000-0000-0000-000000000002', 'assigned', 'Westside to downtown market', now(), now()),
(gen_random_uuid(), 'a0000009-0000-0000-0000-000000000009', 'd0000001-0000-0000-0000-000000000001', 'assigned', 'Afternoon South Valley to Westside', now(), now()),
(gen_random_uuid(), 'a0000010-0000-0000-0000-000000000010', 'd0000002-0000-0000-0000-000000000002', 'assigned', 'Hospital food delivery route', now(), now())
ON CONFLICT (route_id, driver_id) DO NOTHING;