import { config } from "dotenv";
import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/drivers/route";

config({ path: ".env.local" });

const HUB_ID = "1e53e9e8-11db-4012-9451-f996632cd250";

function req(url: string) {
  return new Request(url);
}

describe("GET /api/drivers — integration", () => {
  it("returns all drivers when hub_id is absent", async () => {
    const res = await GET(req("http://localhost/api/drivers"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json)).toBe(true);
    expect(json.length).toBeGreaterThanOrEqual(2);
  });

  it("filters by hub_id", async () => {
    const res = await GET(req(`http://localhost/api/drivers?hub_id=${HUB_ID}`));
    expect(res.status).toBe(200);
    const json = (await res.json()) as Array<{ hubId: string; firstName: string }>;
    expect(json.every((d) => d.hubId === HUB_ID)).toBe(true);
    expect(json.find((d) => d.firstName === "Elena")).toBeDefined();
  });

  it("rejects invalid hub_id with 400", async () => {
    const res = await GET(req("http://localhost/api/drivers?hub_id=not-a-uuid"));
    expect(res.status).toBe(400);
  });
});
