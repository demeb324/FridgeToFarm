-- Migration: seed a demo farmer so the farmer dashboard works without a query param
-- Created: 2026-04-21

INSERT INTO farmers (id, name, phone, address_text, latitude, longitude)
VALUES ('f0000001-0000-0000-0000-000000000001',
        'Demo Farmer',
        '+15550000001',
        '1 Demo Lane, Albuquerque NM',
        35.0894,
        -106.6454)
ON CONFLICT (id) DO NOTHING;
