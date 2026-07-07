import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseAgendaHtml } from "@/lib/scraper/adapters/arena-brb";

describe("parseAgendaHtml", () => {
  it("parses each agenda item into a normalized event", () => {
    const html = readFileSync(join(process.cwd(), "tests/fixtures/arena-brb-agenda.html"), "utf-8");
    const events = parseAgendaHtml(html);

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      externalId: "tour-nosso-mane",
      title: "Tour - Nosso Mané",
      locationName: "Arena BRB Mané Garrincha",
      category: "OUTRO",
      sourceUrl: "https://arenabsb.com.br/agendas/tour-nosso-mane/",
    });
    expect(events[0].dateStart.getFullYear()).toBe(2026);
    expect(events[0].dateStart.getMonth()).toBe(2);
    expect(events[0].dateStart.getDate()).toBe(8);
    expect(events[1].externalId).toBe("real-circo-brasilia");
  });

  it("skips an item with a malformed date instead of throwing or discarding the batch", () => {
    const html = readFileSync(join(process.cwd(), "tests/fixtures/arena-brb-agenda.html"), "utf-8");

    expect(() => parseAgendaHtml(html)).not.toThrow();

    const events = parseAgendaHtml(html);

    // The fixture has 3 items: 2 well-formed + 1 with a malformed date ("8/03/26").
    // Only the 2 well-formed events should be returned.
    expect(events).toHaveLength(2);
    expect(events.map((event) => event.externalId)).toEqual([
      "tour-nosso-mane",
      "real-circo-brasilia",
    ]);
    expect(events.some((event) => event.externalId === "evento-data-malformada")).toBe(false);
  });
});
