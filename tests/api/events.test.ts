import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { GET } from "@/app/api/events/route";
import { NextRequest } from "next/server";

async function seedOne(overrides: Record<string, unknown> = {}) {
  return prisma.event.create({
    data: {
      title: "Show de Teste",
      description: "Descrição",
      category: "SHOW",
      imageUrl: "https://example.com/img.jpg",
      locationName: "Local Teste",
      locationAddress: "Endereço Teste",
      dateStart: new Date("2026-08-01T20:00:00"),
      dateEnd: new Date("2026-08-01T22:00:00"),
      price: 50,
      isFree: false,
      organizer: "Organizador",
      tags: JSON.stringify(["teste"]),
      featured: false,
      status: "ATIVO",
      ...overrides,
    },
  });
}

describe("GET /api/events", () => {
  it("returns all events when no filters are given", async () => {
    await seedOne();
    const res = await GET(new NextRequest("http://localhost/api/events"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toHaveLength(1);
  });

  it("filters by category query param", async () => {
    await seedOne({ category: "SHOW" });
    await seedOne({ category: "TEATRO" });
    const res = await GET(new NextRequest("http://localhost/api/events?category=TEATRO"));
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].category).toBe("TEATRO");
  });
});
