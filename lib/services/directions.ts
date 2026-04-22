export class DirectionsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DirectionsError";
  }
}

export type LatLng = { lat: number; lng: number };

function latLngStr(p: LatLng): string {
  return `${p.lat},${p.lng}`;
}

/**
 * Calls Google Directions API and returns the encoded overview polyline.
 * Waypoints are treated as ordered intermediate stops (not optimized).
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

  const params = new URLSearchParams({
    origin: latLngStr(origin),
    destination: latLngStr(destination),
    key: apiKey,
  });

  if (waypoints.length > 0) {
    // Use plain lat/lng (no "via:" prefix) for stops the driver must visit.
    params.set("waypoints", waypoints.map((w) => latLngStr(w)).join("|"));
  }

  const url = `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`;

  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new DirectionsError(`Network error fetching directions: ${String(err)}`);
  }

  if (!res.ok) {
    throw new DirectionsError(`Directions request failed (HTTP ${res.status})`);
  }

  const data = (await res.json()) as {
    status: string;
    routes: Array<{ overview_polyline: { points: string } }>;
  };

  if (data.status !== "OK" || !data.routes[0]) {
    throw new DirectionsError(`Directions API returned status "${data.status}"`);
  }

  return data.routes[0].overview_polyline.points;
}
