import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export class GeocodeError extends Error {
  constructor(
    public readonly address: string,
    message: string,
  ) {
    super(message);
    this.name = "GeocodeError";
  }
}

export type GeocodeResult = { lat: number; lng: number };

export async function geocodeAddress(
  address: string,
  supabase: SupabaseClient<Database>,
): Promise<GeocodeResult> {
  // Check cache first
  const { data: cached } = await supabase
    .from("geocode_cache")
    .select("lat, lng")
    .eq("address", address)
    .maybeSingle();

  if (cached) {
    return { lat: cached.lat, lng: cached.lng };
  }

  const apiKey =
    process.env.GOOGLE_MAPS_SERVER_KEY ??
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ??
    "";

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;

  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new GeocodeError(address, `Network error geocoding "${address}": ${String(err)}`);
  }

  if (!res.ok) {
    throw new GeocodeError(address, `Geocoding request failed (HTTP ${res.status}) for "${address}"`);
  }

  const data = (await res.json()) as { status: string; results: Array<{ geometry: { location: { lat: number; lng: number } } }> };

  if (data.status !== "OK" || !data.results[0]) {
    throw new GeocodeError(
      address,
      `Geocoding returned status "${data.status}" for address "${address}"`,
    );
  }

  const { lat, lng } = data.results[0].geometry.location;

  // Write to cache (silently catch failures)
  try {
    await supabase
      .from("geocode_cache")
      .upsert({ address, lat, lng });
  } catch {
    // Cache write failure is non-fatal
  }

  return { lat, lng };
}