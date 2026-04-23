import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { getDirectionsPolyline, DirectionsError } from "@/lib/services/directions";

const ENCODED = "gxztEfauiS_fake_polyline_";

const OK_RESPONSE = {
  routes: [{ polyline: { encodedPolyline: ENCODED } }],
};

function makeResponse(body: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

const ORIGIN = { lat: 35.0844, lng: -106.6504 };
const DEST   = { lat: 35.687,  lng: -105.9378 };
const WP     = { lat: 35.3003, lng: -106.5531 };

beforeEach(() => {
  mockFetch.mockReset();
  process.env.GOOGLE_MAPS_SERVER_KEY = "test-server-key";
});

describe("getDirectionsPolyline", () => {
  it("returns the encodedPolyline string", async () => {
    mockFetch.mockReturnValue(makeResponse(OK_RESPONSE));
    const poly = await getDirectionsPolyline(ORIGIN, DEST, []);
    expect(poly).toBe(ENCODED);
  });

  it("POSTs to routes.googleapis.com with key header, field mask, and intermediates", async () => {
    mockFetch.mockReturnValue(makeResponse(OK_RESPONSE));
    await getDirectionsPolyline(ORIGIN, DEST, [WP]);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://routes.googleapis.com/directions/v2:computeRoutes");
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers["X-Goog-Api-Key"]).toBe("test-server-key");
    expect(headers["X-Goog-FieldMask"]).toBe("routes.polyline.encodedPolyline");
    const body = JSON.parse(init.body as string);
    expect(body.origin.location.latLng).toEqual({ latitude: ORIGIN.lat, longitude: ORIGIN.lng });
    expect(body.destination.location.latLng).toEqual({ latitude: DEST.lat, longitude: DEST.lng });
    expect(body.intermediates).toHaveLength(1);
    expect(body.intermediates[0].location.latLng).toEqual({ latitude: WP.lat, longitude: WP.lng });
    expect(body.travelMode).toBe("DRIVE");
    expect(body.polylineEncoding).toBe("ENCODED_POLYLINE");
  });

  it("works with zero waypoints", async () => {
    mockFetch.mockReturnValue(makeResponse(OK_RESPONSE));
    await expect(getDirectionsPolyline(ORIGIN, DEST, [])).resolves.toBe(ENCODED);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.intermediates).toEqual([]);
  });

  it("throws DirectionsError when fetch is not ok", async () => {
    mockFetch.mockReturnValue(makeResponse({}, false, 500));
    await expect(getDirectionsPolyline(ORIGIN, DEST, [])).rejects.toBeInstanceOf(DirectionsError);
  });

  it("throws DirectionsError when routes array is empty", async () => {
    mockFetch.mockReturnValue(makeResponse({ routes: [] }));
    await expect(getDirectionsPolyline(ORIGIN, DEST, [])).rejects.toBeInstanceOf(DirectionsError);
  });

  it("throws DirectionsError when polyline missing", async () => {
    mockFetch.mockReturnValue(makeResponse({ routes: [{}] }));
    await expect(getDirectionsPolyline(ORIGIN, DEST, [])).rejects.toBeInstanceOf(DirectionsError);
  });
});
