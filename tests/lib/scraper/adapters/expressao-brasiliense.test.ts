import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseExpressaoPosts } from "@/lib/scraper/adapters/expressao-brasiliense";

const now = new Date("2026-06-01T00:00:00");

function loadFixture() {
  const raw = readFileSync(join(process.cwd(), "tests/fixtures/expressao-brasiliense.json"), "utf-8");
  return JSON.parse(raw);
}

describe("parseExpressaoPosts", () => {
  it("turns only posts with an extractable date into events, skipping dateless news", () => {
    const events = parseExpressaoPosts(loadFixture(), now);

    // 3 posts in the fixture: 2 dated + 1 dateless (id 63754) which must be dropped.
    expect(events).toHaveLength(2);
    expect(events.map((e) => e.externalId)).toEqual(["63802", "63796"]);
    expect(events.some((e) => e.externalId === "63754")).toBe(false);
  });

  it("parses the first post (date in the title) into a normalized event", () => {
    const [event] = parseExpressaoPosts(loadFixture(), now);

    expect(event).toMatchObject({
      externalId: "63802",
      title: "Arraiá do Rotary 2026 reúne cultura, gastronomia e solidariedade no Setor de Clubes Sul no dia 20 de junho",
      // "gastronomia" in the title → inferCategory returns GASTRONOMIA
      category: "GASTRONOMIA",
      organizer: "Divulgação: Expressão Brasiliense",
      locationName: "Brasília - DF",
      isFree: false,
      sourceUrl:
        "https://expressaobrasiliense.com/cultura/arraia-do-rotary-2026-reune-cultura-gastronomia-e-solidariedade-no-setor-de-clubes-sul-no-dia-20-de-junho/",
    });
    expect(event.imageUrl).toBe("https://expressaobrasiliense.com/wp-content/uploads/2026/06/arraia-do-rotary-1.jpg");
    expect(event.dateStart.getMonth()).toBe(5);
    expect(event.dateStart.getDate()).toBe(20);
  });

  it("falls back to the excerpt when the title has no date", () => {
    const event = parseExpressaoPosts(loadFixture(), now).find((e) => e.externalId === "63796")!;

    // Title has no date; "26 de julho" comes from the excerpt.
    expect(event.category).toBe("FESTIVAL");
    expect(event.dateStart.getMonth()).toBe(6);
    expect(event.dateStart.getDate()).toBe(26);
  });

  it("skips a malformed post instead of throwing or discarding the batch", () => {
    const posts = [
      { id: 111, link: "https://expressaobrasiliense.com/a/", title: { rendered: null }, excerpt: { rendered: "no dia 10 de agosto" } },
      { id: 222, link: "https://expressaobrasiliense.com/b/", title: { rendered: "Evento válido no dia 12 de agosto" }, excerpt: { rendered: "" } },
    ];

    expect(() => parseExpressaoPosts(posts as never, now)).not.toThrow();
    const events = parseExpressaoPosts(posts as never, now);
    expect(events.map((e) => e.externalId)).toEqual(["222"]);
  });
});
