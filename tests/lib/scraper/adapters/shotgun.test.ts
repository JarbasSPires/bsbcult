import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseShotgunEvents } from "@/lib/scraper/adapters/shotgun";

const now = new Date("2026-07-01T00:00:00");

function loadFixture() {
  return readFileSync(join(process.cwd(), "tests/fixtures/shotgun-infinu.html"), "utf-8");
}

describe("parseShotgunEvents", () => {
  it("parses the venue event cards into normalized events", () => {
    const events = parseShotgunEvents(loadFixture(), now);

    expect(events).toHaveLength(3);
    expect(events.map((e) => e.externalId)).toEqual([
      "infinu-recebe-makumba1",
      "infinu-recebe-soxodo-23",
      "leoaembsb",
    ]);

    const [makumba] = events;
    expect(makumba).toMatchObject({
      externalId: "infinu-recebe-makumba1",
      title: "Infinu Recebe Makumbá",
      category: "SHOW",
      price: 20,
      organizer: "Infinu Comunidade Criativa",
      locationName: "Infinu Comunidade Criativa",
      isFree: false,
      soldOut: false,
      sourceUrl: "https://shotgun.live/pt-br/events/infinu-recebe-makumba1",
    });
    expect(makumba.locationAddress).toContain("Asa Sul");
    expect(makumba.imageUrl).toContain("cloudinary.com");
    // 2026-07-09T23:00Z = 2026-07-09 20:00 in America/Sao_Paulo
    expect(makumba.dateStart.getMonth()).toBe(6);
    expect(makumba.dateStart.getDate()).toBe(9);
  });

  it("captures price and infers CULTURA_POPULAR from a forró event", () => {
    const soxodo = parseShotgunEvents(loadFixture(), now).find((e) => e.externalId === "infinu-recebe-soxodo-23")!;
    expect(soxodo.price).toBe(15);
    expect(soxodo.category).toBe("CULTURA_POPULAR");
  });

  it("drops past events and returns [] when there are no event cards", () => {
    expect(parseShotgunEvents(loadFixture(), new Date("2026-08-01T00:00:00"))).toEqual([]);
    expect(parseShotgunEvents("<html><body>no events</body></html>", now)).toEqual([]);
  });
});
