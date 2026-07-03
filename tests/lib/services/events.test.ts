import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  listEvents,
  getFeaturedEvents,
  getEventById,
  getRelatedEvents,
} from "@/lib/services/events";

async function makeEvent(overrides: Partial<Parameters<typeof prisma.event.create>[0]["data"]> = {}) {
  return prisma.event.create({
    data: {
      title: "Show de Rock",
      description: "Uma noite de rock autoral",
      category: "SHOW",
      imageUrl: "https://example.com/img.jpg",
      locationName: "CCBB Brasília",
      locationAddress: "SCES Trecho 2",
      dateStart: new Date("2026-08-01T20:00:00"),
      dateEnd: new Date("2026-08-01T23:00:00"),
      price: 50,
      isFree: false,
      organizer: "Produtora X",
      tags: JSON.stringify(["rock"]),
      featured: false,
      status: "ATIVO",
      ...overrides,
    },
  });
}

describe("listEvents", () => {
  it("filters by search query across title, description, and location", async () => {
    await makeEvent({ title: "Festival de Jazz" });
    await makeEvent({ title: "Peça Infantil", description: "Diversão garantida" });

    const result = await listEvents({ q: "jazz" });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Festival de Jazz");
  });

  it("filters by category", async () => {
    await makeEvent({ category: "SHOW" });
    await makeEvent({ category: "TEATRO" });

    const result = await listEvents({ category: "TEATRO" });
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe("TEATRO");
  });

  it("filters by isFree", async () => {
    await makeEvent({ isFree: true, price: null });
    await makeEvent({ isFree: false, price: 100 });

    const result = await listEvents({ isFree: true });
    expect(result).toHaveLength(1);
    expect(result[0].isFree).toBe(true);
  });

  it("orders results by dateStart ascending", async () => {
    await makeEvent({ title: "Depois", dateStart: new Date("2026-09-01") });
    await makeEvent({ title: "Antes", dateStart: new Date("2026-08-01") });

    const result = await listEvents();
    expect(result.map((e) => e.title)).toEqual(["Antes", "Depois"]);
  });
});

describe("getFeaturedEvents", () => {
  it("returns only featured, active events", async () => {
    await makeEvent({ title: "Destaque", featured: true, status: "ATIVO" });
    await makeEvent({ title: "Normal", featured: false });
    await makeEvent({ title: "Encerrado", featured: true, status: "ENCERRADO" });

    const result = await getFeaturedEvents();
    expect(result.map((e) => e.title)).toEqual(["Destaque"]);
  });
});

describe("getEventById", () => {
  it("returns the event when found", async () => {
    const created = await makeEvent();
    const result = await getEventById(created.id);
    expect(result?.id).toBe(created.id);
  });

  it("returns null when not found", async () => {
    const result = await getEventById("does-not-exist");
    expect(result).toBeNull();
  });
});

describe("getRelatedEvents", () => {
  it("returns active events in the same category, excluding itself", async () => {
    const main = await makeEvent({ category: "SHOW" });
    const related = await makeEvent({ title: "Outro Show", category: "SHOW" });
    await makeEvent({ title: "Show Encerrado", category: "SHOW", status: "ENCERRADO" });
    await makeEvent({ title: "Teatro", category: "TEATRO" });

    const result = await getRelatedEvents(main);
    expect(result.map((e) => e.id)).toEqual([related.id]);
  });
});
