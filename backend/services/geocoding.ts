export interface GeocodingResult {
  lat: number
  lng: number
  formatted_address: string
}

/**
 * Geocode an address string to lat/lng using Google Geocoding API.
 * Throws on API errors or zero results.
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY is not set")
  }

  console.log(`[geocoding] Geocoding: "${address}"`)

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`

  const response = await fetch(url)
  const data = await response.json()

  if (data.status !== "OK" || !data.results?.length) {
    console.error(`[geocoding] No results for "${address}": ${data.status}`)
    throw new Error(
      `Geocoding failed for "${address}": ${data.status} — ${data.error_message || "no results"}`
    )
  }

  const result = data.results[0]
  const { lat, lng } = result.geometry.location

  console.log(`[geocoding] Result: ${lat}, ${lng} — ${result.formatted_address}`)

  return {
    lat,
    lng,
    formatted_address: result.formatted_address,
  }
}
