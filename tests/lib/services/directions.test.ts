import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { getDirectionsPolyline, DirectionsError } from "@/lib/services/directions";

const ENCODED = "gxztEfauiS_fake_polyline_";

const OK_RESPONSE = {
  status: "OK",
  routes: [{ overview_polyline: { points: ENCODED } }],
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
  it("returns the overview_polyline.points string", async () => {
    mockFetch.mockReturnValue(makeResponse(OK_RESPONSE));
    const poly = await getDirectionsPolyline(ORIGIN, DEST, []);
    expect(poly).toBe(ENCODED);
  });

  it("includes origin, destination, and waypoints in the URL", async () => {
    mockFetch.mockReturnValue(makeResponse(OK_RESPONSE));
    await getDirectionsPolyline(ORIGIN, DEST, [WP]);
    const url: string = mockFetch.mock.calls[0][0];
    expect(url).toContain("maps.googleapis.com/maps/api/directions");
    expect(url).toContain("origin=");
    expect(url).toContain("destination=");
    expect(url).toContain("waypoints=");
  });

  it("works with zero waypoints", async () => {
    mockFetch.mockReturnValue(makeResponse(OK_RESPONSE));
    await expect(getDirectionsPolyline(ORIGIN, DEST, [])).resolves.toBe(ENCODED);
  });

  it("throws DirectionsError when status is NOT_FOUND", async () => {
    mockFetch.mockReturnValue(makeResponse({ status: "NOT_FOUND", routes: [] }));
    await expect(getDirectionsPolyline(ORIGIN, DEST, [])).rejects.toBeInstanceOf(DirectionsError);
  });

  it("throws DirectionsError when fetch is not ok", async () => {
    mockFetch.mockReturnValue(makeResponse({}, false, 500));
    await expect(getDirectionsPolyline(ORIGIN, DEST, [])).rejects.toBeInstanceOf(DirectionsError);
  });

  it("throws DirectionsError when routes array is empty", async () => {
    mockFetch.mockReturnValue(makeResponse({ status: "OK", routes: [] }));
    await expect(getDirectionsPolyline(ORIGIN, DEST, [])).rejects.toBeInstanceOf(DirectionsError);
  });
});
