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

function createMockSupabase(cacheResult: { lat: number; lng: number } | null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: cacheResult, error: null });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn().mockReturnValue({ select, upsert });
  return { from, _select: select, _eq: eq, _maybeSingle: maybeSingle, _upsert: upsert };
}

beforeEach(() => {
  mockFetch.mockReset();
  process.env.GOOGLE_MAPS_SERVER_KEY = "test-server-key";
});

describe("geocodeAddress", () => {
  it("returns lat/lng for a valid address", async () => {
    const mockSupabase = createMockSupabase(null);
    mockFetch.mockReturnValue(makeResponse(OK_RESPONSE));
    const result = await geocodeAddress("400 Marquette Ave NW, Albuquerque, NM", mockSupabase as unknown as Parameters<typeof geocodeAddress>[1]);
    expect(result.lat).toBeCloseTo(35.0844);
    expect(result.lng).toBeCloseTo(-106.6504);
  });

  it("includes the API key and encoded address in the URL", async () => {
    const mockSupabase = createMockSupabase(null);
    mockFetch.mockReturnValue(makeResponse(OK_RESPONSE));
    await geocodeAddress("Test Address", mockSupabase as unknown as Parameters<typeof geocodeAddress>[1]);
    const url: string = mockFetch.mock.calls[0][0];
    expect(url).toContain("maps.googleapis.com/maps/api/geocode");
    expect(url).toContain("test-server-key");
    expect(url).toContain(encodeURIComponent("Test Address"));
  });

  it("throws GeocodeError when status is ZERO_RESULTS", async () => {
    const mockSupabase = createMockSupabase(null);
    mockFetch.mockReturnValue(makeResponse({ status: "ZERO_RESULTS", results: [] }));
    await expect(geocodeAddress("Nowhere, XZ", mockSupabase as unknown as Parameters<typeof geocodeAddress>[1])).rejects.toBeInstanceOf(GeocodeError);
  });

  it("throws GeocodeError when fetch response is not ok", async () => {
    const mockSupabase = createMockSupabase(null);
    mockFetch.mockReturnValue(makeResponse({}, false, 500));
    await expect(geocodeAddress("Test", mockSupabase as unknown as Parameters<typeof geocodeAddress>[1])).rejects.toBeInstanceOf(GeocodeError);
  });

  it("falls back to NEXT_PUBLIC_GOOGLE_MAPS_API_KEY when server key is absent", async () => {
    const mockSupabase = createMockSupabase(null);
    delete process.env.GOOGLE_MAPS_SERVER_KEY;
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = "public-fallback-key";
    mockFetch.mockReturnValue(makeResponse(OK_RESPONSE));
    await geocodeAddress("Test", mockSupabase as unknown as Parameters<typeof geocodeAddress>[1]);
    const url: string = mockFetch.mock.calls[0][0];
    expect(url).toContain("public-fallback-key");
  });

  describe("cache", () => {
    it("returns cached result without calling fetch on cache hit", async () => {
      const mockSupabase = createMockSupabase({ lat: 35.0, lng: -106.0 });
      const result = await geocodeAddress("Cached Address", mockSupabase as unknown as Parameters<typeof geocodeAddress>[1]);
      expect(result.lat).toBeCloseTo(35.0);
      expect(result.lng).toBeCloseTo(-106.0);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("calls fetch and writes to cache on cache miss", async () => {
      const mockSupabase = createMockSupabase(null);
      mockFetch.mockReturnValue(makeResponse(OK_RESPONSE));
      const result = await geocodeAddress("Uncached Address", mockSupabase as unknown as Parameters<typeof geocodeAddress>[1]);
      expect(result.lat).toBeCloseTo(35.0844);
      expect(result.lng).toBeCloseTo(-106.6504);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockSupabase._upsert).toHaveBeenCalledWith({
        address: "Uncached Address",
        lat: 35.0844,
        lng: -106.6504,
      });
    });

    it("returns geocode result even if cache write throws", async () => {
      const mockSupabase = createMockSupabase(null);
      mockSupabase._upsert.mockRejectedValue(new Error("DB write failed"));
      mockFetch.mockReturnValue(makeResponse(OK_RESPONSE));
      const result = await geocodeAddress("Write Fail Address", mockSupabase as unknown as Parameters<typeof geocodeAddress>[1]);
      expect(result.lat).toBeCloseTo(35.0844);
      expect(result.lng).toBeCloseTo(-106.6504);
    });
  });
});