import { vi } from "vitest";

// Mock the entire twilio module so integration tests never hit the network.
// Every call to `new Twilio(...).messages.create(...)` returns a deterministic
// fake sid with status "queued" (sendSms maps queued → "sent").
vi.mock("twilio", () => {
  let counter = 0;

  function Twilio(this: any, _accountSid: string, _authToken: string) {
    this.messages = {
      create: vi.fn().mockImplementation(async (opts: { to: string; body?: string }) => {
        counter += 1;
        return {
          sid: `SM_mock_${counter.toString().padStart(8, "0")}`,
          status: "queued",
          to: opts.to,
          body: opts.body ?? "",
        };
      }),
      list: vi.fn().mockResolvedValue([]),
    };
  }

  const TwilioMock = vi.fn().mockImplementation(function (
    this: any,
    accountSid: string,
    authToken: string,
  ) {
    Twilio.call(this, accountSid, authToken);
  });

  return { Twilio: TwilioMock, default: TwilioMock };
});

// ---------------------------------------------------------------------------
// Google Maps API network guard
// ---------------------------------------------------------------------------
// Intercept any fetch call to maps.googleapis.com and return a minimal valid
// response. Individual test files that need specific payloads should install
// their own vi.stubGlobal("fetch", mockFn) BEFORE importing the module under
// test — that override takes precedence.
//
// This guard prevents accidents when new service modules are tested without
// an explicit fetch mock.
// ---------------------------------------------------------------------------
const _realFetch = globalThis.fetch;

vi.stubGlobal(
  "fetch",
  vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

    if (typeof url === "string" && url.includes("maps.googleapis.com")) {
      // Determine which API is being called and return a minimal valid stub.
      if (url.includes("/geocode/")) {
        return new Response(
          JSON.stringify({
            status: "OK",
            results: [{ geometry: { location: { lat: 35.0844, lng: -106.6504 } } }],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      // Unknown Google endpoint — fail loudly so tests don't silently pass.
      throw new Error(
        `[vitest.setup] Unmocked Google Maps fetch intercepted: ${url.slice(0, 120)}`,
      );
    }

    if (typeof url === "string" && url.includes("routes.googleapis.com")) {
      return new Response(
        JSON.stringify({
          routes: [{ polyline: { encodedPolyline: "mock_polyline_stub" } }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    // All non-Google fetches pass through to the real implementation.
    return _realFetch(input, init);
  }),
);
