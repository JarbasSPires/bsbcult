import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseWordPressPosts } from "@/lib/scraper/adapters/clube-do-choro";

describe("parseWordPressPosts", () => {
  it("parses each post into a normalized event", () => {
    const raw = readFileSync(join(process.cwd(), "tests/fixtures/clube-do-choro-posts.json"), "utf-8");
    const events = parseWordPressPosts(JSON.parse(raw));

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      externalId: "59233",
      title: "BAILE DA NOMMA – COMEMORAÇÃO DE 30 ANOS DE CARREIRA",
      locationName: "Clube do Choro",
      category: "SHOW",
      imageUrl: "https://clubedochoro.com.br/wp-content/uploads/2026/06/imagem_2026-06-18_105700495.png",
      sourceUrl: "https://clubedochoro.com.br/07-07-baile-da-nomma-comemoracao-de-30-anos-de-carreira/",
    });
    expect(events[0].dateStart.getMonth()).toBe(6);
    expect(events[0].dateStart.getDate()).toBe(7);
  });

  it("falls back to a generic description when the excerpt is empty, and a default image when there is none embedded", () => {
    const raw = readFileSync(join(process.cwd(), "tests/fixtures/clube-do-choro-posts.json"), "utf-8");
    const events = parseWordPressPosts(JSON.parse(raw));

    expect(events[0].description).toBe("Evento no Clube do Choro. Mais detalhes no link oficial.");
    expect(events[1].description).toBe("Um tributo à obra de Chico Buarque.");
    expect(events[1].imageUrl).toContain("clubedochoro.com.br");
  });

  it("skips a post with a null title instead of throwing or discarding the batch", () => {
    const raw = readFileSync(join(process.cwd(), "tests/fixtures/clube-do-choro-posts.json"), "utf-8");

    expect(() => parseWordPressPosts(JSON.parse(raw))).not.toThrow();

    const events = parseWordPressPosts(JSON.parse(raw));

    // The fixture has 3 posts: 2 well-formed + 1 with title.rendered === null
    // (which would throw inside he.decode without the fault-isolation guard).
    // Only the 2 well-formed events should be returned.
    expect(events).toHaveLength(2);
    expect(events.map((event) => event.externalId)).toEqual(["59233", "59202"]);
    expect(events.some((event) => event.externalId === "59300")).toBe(false);
  });
});
