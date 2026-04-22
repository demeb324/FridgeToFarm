import { describe, it, expect, vi, beforeEach } from "vitest";

// fetch is mocked globally in vitest.setup.ts after Task 4.
// For this test file we install a local override.
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { geocodeAddress, GeocodeError } from "@/lib/services/geocode";

const OK_RESPONSE = {
  status: "OK",
  results: [{ geometry: { location: { lat: 35.0844, lng: -106.6504 } } }],
};

function makeResponse(body: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

beforeEach(() => {
  mockFetch.mockReset();
  process.env.GOOGLE_MAPS_SERVER_KEY = "test-server-key";
});

describe("geocodeAddress", () => {
  it("returns lat/lng for a valid address", async () => {
    mockFetch.mockReturnValue(makeResponse(OK_RESPONSE));
    const result = await geocodeAddress("400 Marquette Ave NW, Albuquerque, NM");
    expect(result.lat).toBeCloseTo(35.0844);
    expect(result.lng).toBeCloseTo(-106.6504);
  });

  it("includes the API key and encoded address in the URL", async () => {
    mockFetch.mockReturnValue(makeResponse(OK_RESPONSE));
    await geocodeAddress("Test Address");
    const url: string = mockFetch.mock.calls[0][0];
    expect(url).toContain("maps.googleapis.com/maps/api/geocode");
    expect(url).toContain("test-server-key");
    expect(url).toContain(encodeURIComponent("Test Address"));
  });

  it("throws GeocodeError when status is ZERO_RESULTS", async () => {
    mockFetch.mockReturnValue(makeResponse({ status: "ZERO_RESULTS", results: [] }));
    await expect(geocodeAddress("Nowhere, XZ")).rejects.toBeInstanceOf(GeocodeError);
  });

  it("throws GeocodeError when fetch response is not ok", async () => {
    mockFetch.mockReturnValue(makeResponse({}, false, 500));
    await expect(geocodeAddress("Test")).rejects.toBeInstanceOf(GeocodeError);
  });

  it("falls back to NEXT_PUBLIC_GOOGLE_MAPS_API_KEY when server key is absent", async () => {
    delete process.env.GOOGLE_MAPS_SERVER_KEY;
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = "public-fallback-key";
    mockFetch.mockReturnValue(makeResponse(OK_RESPONSE));
    await geocodeAddress("Test");
    const url: string = mockFetch.mock.calls[0][0];
    expect(url).toContain("public-fallback-key");
  });
});