import { config } from "dotenv";
import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/hubs/route";

config({ path: ".env.local" });

describe("GET /api/hubs — integration", () => {
  it("returns seeded hub with id, name, phone, email", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = (await res.json()) as Array<{ id: string; name: string; phone: string; email: string }>;
    expect(Array.isArray(json)).toBe(true);
    const seeded = json.find((h) => h.id === "1e53e9e8-11db-4012-9451-f996632cd250");
    expect(seeded).toBeDefined();
    expect(seeded!.name).toBe("FridgeToFarm Logistics");
    expect(seeded!.phone).toBe("+15052267853");
    expect(seeded!.email).toContain("@");
  });
});
