import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseSesiEvents } from "@/lib/scraper/adapters/sesi-lab";

const now = new Date("2026-06-01T00:00:00");

function loadFixture() {
  const raw = readFileSync(join(process.cwd(), "tests/fixtures/sesi-lab.json"), "utf-8");
  return JSON.parse(raw);
}

describe("parseSesiEvents", () => {
  it("keeps upcoming events and drops ones that have already ended", () => {
    const events = parseSesiEvents(loadFixture(), now);

    // Fixture has 2 items: "Brinca+" (ends 2026-08-02, upcoming) and
    // "Cores e corais" (2025-04-09, long past) which must be dropped.
    expect(events).toHaveLength(1);
    expect(events[0].externalId).toBe("4515971");
  });

  it("normalizes the upcoming event with age rating, free flag, and inferred category", () => {
    const [event] = parseSesiEvents(loadFixture(), now);

    expect(event).toMatchObject({
      externalId: "4515971",
      title: "Brinca+",
      // description mentions "oficinas" → inferCategory returns PALESTRA
      category: "PALESTRA",
      ageRating: "Livre",
      isFree: true,
      organizer: "SESI Lab",
      locationName: "SESI Lab",
    });
    expect(event.locationAddress).toContain("Asa Norte");
    expect(event.dateStart.getMonth()).toBe(6);
    expect(event.dateStart.getDate()).toBe(5);
  });

  it("skips an item with an empty title instead of throwing or discarding the batch", () => {
    const items = [
      { id: 1, titulo: "  ", dataDeInicio: "2026-09-01T00:00:00.000Z" },
      { id: 2, titulo: "Oficina válida", dataDeInicio: "2026-09-10T00:00:00.000Z", classificacaoEtaria: { key: "livre", name: "Livre" } },
    ];

    expect(() => parseSesiEvents(items as never, now)).not.toThrow();
    const events = parseSesiEvents(items as never, now);
    expect(events.map((e) => e.externalId)).toEqual(["2"]);
  });
});
