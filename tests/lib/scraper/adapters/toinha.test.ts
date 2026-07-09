import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseToinhaEvents } from "@/lib/scraper/adapters/toinha";

const now = new Date("2026-06-01T00:00:00");

function loadFixture() {
  return readFileSync(join(process.cwd(), "tests/fixtures/toinha.html"), "utf-8");
}

describe("parseToinhaEvents", () => {
  it("parses the Wix events array into normalized events", () => {
    const events = parseToinhaEvents(loadFixture(), now);

    expect(events).toHaveLength(3);
    expect(events.map((e) => e.externalId)).toEqual([
      "nightwish-party-as-tres-eras",
      "black-label-society-em-brasilia",
      "the-white-buffalo-em-brasilia-tour-2026",
    ]);

    const [nightwish] = events;
    expect(nightwish).toMatchObject({
      externalId: "nightwish-party-as-tres-eras",
      title: "Nightwish Party - As Três Eras",
      // rock/metal venue: "banda" in description → SHOW (default SHOW anyway)
      category: "SHOW",
      organizer: "Toinha Brasil Show",
      locationName: "Toinha Brasil Show",
      sourceUrl: "https://www.toinhabrasilshow.com/event-details/nightwish-party-as-tres-eras",
    });
    // startDate 2026-08-15T23:00Z → 2026-08-15 20:00 in America/Sao_Paulo
    expect(nightwish.dateStart.getMonth()).toBe(7);
    expect(nightwish.dateStart.getDate()).toBe(15);
    expect(nightwish.locationAddress).toContain("Brasília");
    expect(nightwish.imageUrl).toContain("wixstatic.com");
  });

  it("drops events whose date has already passed", () => {
    const events = parseToinhaEvents(loadFixture(), new Date("2027-01-01T00:00:00"));
    expect(events).toHaveLength(0);
  });

  it("skips an event with no start date and returns [] when there is no events array", () => {
    const html = `<script type="application/json">{"events":[
      {"slug":"sem-data","title":"Sem data","scheduling":{"config":{}},"location":{"name":"Toinha Brasil Show"}},
      {"slug":"com-data","title":"Com data","scheduling":{"config":{"startDate":"2026-09-10T23:00:00.000Z"}},"location":{"name":"Toinha Brasil Show","address":"Guará, Brasília - DF"}}
    ]}</script>`;

    expect(() => parseToinhaEvents(html, now)).not.toThrow();
    expect(parseToinhaEvents(html, now).map((e) => e.externalId)).toEqual(["com-data"]);
    expect(parseToinhaEvents("<html><body>no data here</body></html>", now)).toEqual([]);
  });
});
