import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { listEventSources } from "@/lib/services/event-sources";

describe("listEventSources", () => {
  it("returns sources ordered by name", async () => {
    await prisma.eventSource.create({
      data: { name: "Clube do Choro", slug: "clube-do-choro", baseUrl: "https://clubedochoro.com.br", adapterType: "WORDPRESS" },
    });
    await prisma.eventSource.create({
      data: { name: "Arena BRB", slug: "arena-brb", baseUrl: "https://arenabsb.com.br", adapterType: "HTML" },
    });

    const sources = await listEventSources();
    expect(sources.map((s) => s.name)).toEqual(["Arena BRB", "Clube do Choro"]);
  });
});
