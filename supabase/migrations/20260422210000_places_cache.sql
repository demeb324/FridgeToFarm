CREATE TABLE IF NOT EXISTS places_cache (
  input     text        NOT NULL PRIMARY KEY,
  results   jsonb       NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
