import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  listEvents,
  getFeaturedEvents,
  getEventById,
  getRelatedEvents,
  getUpcomingHighlights,
  getUpcomingEventsExcludingSources,
} from "@/lib/services/events";

const DAY = 24 * 60 * 60 * 1000;
const past = { dateStart: new Date(Date.now() - 3 * DAY), dateEnd: new Date(Date.now() - 2 * DAY) };
const future = { dateStart: new Date(Date.now() + 2 * DAY), dateEnd: new Date(Date.now() + 3 * DAY) };

async function makeSource(slug: string) {
  return prisma.eventSource.create({
    data: { name: slug, slug, baseUrl: `https://${slug}.example.com`, adapterType: "HTML" },
  });
}

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

  it("filters by sourceId", async () => {
    const source = await prisma.eventSource.create({
      data: { name: "Arena BRB", slug: "arena-brb", baseUrl: "https://arenabsb.com.br", adapterType: "HTML" },
    });
    await makeEvent({ title: "Da Arena", sourceId: source.id });
    await makeEvent({ title: "Manual" });

    const result = await listEvents({ sourceId: source.id });
    expect(result.map((e) => e.title)).toEqual(["Da Arena"]);
  });

  it("filters to only manually-created events with the MANUAL sentinel", async () => {
    const source = await prisma.eventSource.create({
      data: { name: "Arena BRB", slug: "arena-brb", baseUrl: "https://arenabsb.com.br", adapterType: "HTML" },
    });
    await makeEvent({ title: "Da Arena", sourceId: source.id });
    await makeEvent({ title: "Manual" });

    const result = await listEvents({ sourceId: "MANUAL" });
    expect(result.map((e) => e.title)).toEqual(["Manual"]);
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
    const related = await makeEvent({ title: "Outro Show", category: "SHOW", ...future });
    await makeEvent({ title: "Show Encerrado", category: "SHOW", status: "ENCERRADO" });
    await makeEvent({ title: "Teatro", category: "TEATRO" });

    const result = await getRelatedEvents(main);
    expect(result.map((e) => e.id)).toEqual([related.id]);
  });
});

describe("upcoming filtering", () => {
  it("hides events that have already ended when upcoming is set", async () => {
    await makeEvent({ title: "Passado", ...past });
    await makeEvent({ title: "Futuro", ...future });

    const result = await listEvents({ upcoming: true });
    expect(result.map((e) => e.title)).toEqual(["Futuro"]);
  });

  it("keeps an ongoing multi-day event whose end is still in the future", async () => {
    await makeEvent({
      title: "Em curso",
      dateStart: new Date(Date.now() - DAY),
      dateEnd: new Date(Date.now() + DAY),
    });

    const result = await listEvents({ upcoming: true });
    expect(result.map((e) => e.title)).toEqual(["Em curso"]);
  });
});

describe("getUpcomingHighlights", () => {
  it("returns upcoming events only from the given source slugs", async () => {
    const sympla = await makeSource("sympla");
    const arena = await makeSource("arena-brb");
    await makeEvent({ title: "Do Sympla", sourceId: sympla.id, ...future });
    await makeEvent({ title: "Da Arena", sourceId: arena.id, ...future });
    await makeEvent({ title: "Sympla passado", sourceId: sympla.id, ...past });

    const result = await getUpcomingHighlights(["sympla", "shotgun"]);
    expect(result.map((e) => e.title)).toEqual(["Do Sympla"]);
  });
});

describe("getUpcomingEventsExcludingSources", () => {
  it("returns upcoming events except those from the given sources, including manual ones", async () => {
    const sympla = await makeSource("sympla");
    await makeEvent({ title: "Do Sympla", sourceId: sympla.id, ...future });
    await makeEvent({ title: "Manual", ...future });
    await makeEvent({ title: "Manual passado", ...past });

    const result = await getUpcomingEventsExcludingSources(["sympla", "shotgun"]);
    expect(result.map((e) => e.title)).toEqual(["Manual"]);
  });
});
