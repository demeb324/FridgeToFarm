import { describe, it, expect } from "vitest";
import { routeColor } from "@/lib/routes/route-color";

describe("routeColor", () => {
  it("returns deterministic value for same id", () => {
    expect(routeColor("abc")).toBe(routeColor("abc"));
  });

  it("returns different values for different ids", () => {
    expect(routeColor("abc")).not.toBe(routeColor("xyz"));
  });

  it("returns an hsl() string", () => {
    expect(routeColor("abc")).toMatch(/^hsl\(\d+(\.\d+)?, \d+(\.\d+)?%, \d+(\.\d+)?%\)$/);
  });

  it("returns empty-safe hsl() for empty string", () => {
    expect(routeColor("")).toMatch(/^hsl\(/);
  });
});
