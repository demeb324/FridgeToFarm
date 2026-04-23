export class DirectionsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DirectionsError";
  }
}

export type LatLng = { lat: number; lng: number };

function waypoint(p: LatLng) {
  return { location: { latLng: { latitude: p.lat, longitude: p.lng } } };
}

/**
 * Calls Google Routes API (computeRoutes) and returns the encoded overview polyline.
 * Intermediates are ordered must-visit stops (not optimized).
 */
export async function getDirectionsPolyline(
  origin: LatLng,
  destination: LatLng,
  waypoints: LatLng[],
): Promise<string> {
  const apiKey =
    process.env.GOOGLE_MAPS_SERVER_KEY ??
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ??
    "";

  const body = {
    origin: waypoint(origin),
    destination: waypoint(destination),
    intermediates: waypoints.map(waypoint),
    travelMode: "DRIVE",
    polylineEncoding: "ENCODED_POLYLINE",
  };

  const url = "https://routes.googleapis.com/directions/v2:computeRoutes";

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "routes.polyline.encodedPolyline",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new DirectionsError(`Network error fetching directions: ${String(err)}`);
  }

  if (!res.ok) {
    throw new DirectionsError(`Directions request failed (HTTP ${res.status})`);
  }

  const data = (await res.json()) as {
    routes?: Array<{ polyline?: { encodedPolyline?: string } }>;
  };

  const encoded = data.routes?.[0]?.polyline?.encodedPolyline;
  if (!encoded) {
    throw new DirectionsError("Routes API returned no polyline");
  }

  return encoded;
}
