import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type AutocompletePrediction = {
  place_id: string;
  description: string;
};

export async function autocompletePlaces(
  input: string,
  supabase: SupabaseClient<Database>,
): Promise<AutocompletePrediction[]> {
  const normalized = input.trim();
  if (normalized.length < 3) return [];

  const { data: cached } = await supabase
    .from("places_cache")
    .select("results")
    .eq("input", normalized)
    .maybeSingle();

  if (cached) {
    return cached.results as AutocompletePrediction[];
  }

  const apiKey =
    process.env.GOOGLE_MAPS_SERVER_KEY ??
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ??
    "";

  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(normalized)}&types=geocode&components=country:us&key=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) return [];

  const data = (await res.json()) as {
    status: string;
    predictions: Array<{ place_id: string; description: string }>;
  };

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") return [];

  const predictions: AutocompletePrediction[] = (data.predictions ?? []).map((p) => ({
    place_id: p.place_id,
    description: p.description,
  }));

  try {
    await supabase
      .from("places_cache")
      .upsert({ input: normalized, results: JSON.parse(JSON.stringify(predictions)) });
  } catch {
    // Cache write failure is non-fatal
  }

  return predictions;
}
