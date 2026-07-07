import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { runAdapter } from "@/lib/scraper/upsert";
import type { EventSourceAdapter, NormalizedEvent } from "@/lib/scraper/types";

function makeNormalized(overrides: Partial<NormalizedEvent> = {}): NormalizedEvent {
  return {
    externalId: "ext-1",
    title: "Show de Teste",
    description: "Descrição de teste",
    category: "SHOW",
    imageUrl: "https://example.com/img.jpg",
    locationName: "Local de Teste",
    locationAddress: "Endereço de Teste",
    dateStart: new Date("2026-09-01T20:00:00"),
    dateEnd: new Date("2026-09-01T23:00:00"),
    price: 50,
    isFree: false,
    organizer: "Organizador Teste",
    tags: ["teste"],
    sourceUrl: "https://example.com/evento",
    ...overrides,
  };
}

function makeAdapter(events: NormalizedEvent[], slug = "fonte-teste"): EventSourceAdapter {
  return {
    slug,
    name: "Fonte de Teste",
    baseUrl: "https://example.com",
    adapterType: "HTML",
    fetchEvents: async () => events,
  };
}

describe("runAdapter", () => {
  it("creates a new event and registers the EventSource on first run", async () => {
    const result = await runAdapter(makeAdapter([makeNormalized()]));

    expect(result.ok).toBe(true);
    expect(result.count).toBe(1);

    const source = await prisma.eventSource.findUnique({ where: { slug: "fonte-teste" } });
    expect(source?.lastRunStatus).toBe("OK");

    const event = await prisma.event.findFirst({ where: { externalId: "ext-1" } });
    expect(event?.title).toBe("Show de Teste");
  });

  it("upserts (not duplicates) the same externalId on a second run", async () => {
    await runAdapter(makeAdapter([makeNormalized()]));
    await runAdapter(makeAdapter([makeNormalized({ title: "Show de Teste (Atualizado)" })]));

    const events = await prisma.event.findMany({ where: { externalId: "ext-1" } });
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe("Show de Teste (Atualizado)");
  });

  it("logs a change when a tracked field changes", async () => {
    await runAdapter(makeAdapter([makeNormalized({ price: 50 })]));
    await runAdapter(makeAdapter([makeNormalized({ price: 80 })]));

    const event = await prisma.event.findFirst({ where: { externalId: "ext-1" } });
    const changes = await prisma.eventChangeLog.findMany({ where: { eventId: event!.id } });
    expect(changes.some((c) => c.field === "price" && c.newValue === "80")).toBe(true);
  });

  it("marks an event ENCERRADO when it disappears from a later run", async () => {
    await runAdapter(makeAdapter([makeNormalized()]));
    await runAdapter(makeAdapter([]));

    const event = await prisma.event.findFirst({ where: { externalId: "ext-1" } });
    expect(event?.status).toBe("ENCERRADO");
  });

  it("does not create a duplicate when a cross-source match already exists", async () => {
    await runAdapter(makeAdapter([makeNormalized()], "fonte-a"));
    await runAdapter(
      makeAdapter(
        [makeNormalized({ externalId: "outro-id", sourceUrl: "https://example.com/outro" })],
        "fonte-b"
      )
    );

    const events = await prisma.event.findMany({ where: { title: "Show de Teste" } });
    expect(events).toHaveLength(1);
  });

  it("records a failed run without throwing", async () => {
    const brokenAdapter: EventSourceAdapter = {
      slug: "fonte-quebrada",
      name: "Fonte Quebrada",
      baseUrl: "https://example.com",
      adapterType: "HTML",
      fetchEvents: async () => {
        throw new Error("Falha simulada de rede");
      },
    };

    const result = await runAdapter(brokenAdapter);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Falha simulada de rede");

    const source = await prisma.eventSource.findUnique({ where: { slug: "fonte-quebrada" } });
    expect(source?.lastRunStatus).toBe("ERROR");
  });
});
