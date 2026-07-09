import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseSymplaEvents } from "@/lib/scraper/adapters/sympla";

const now = new Date("2026-07-09T00:00:00");

function loadFixture() {
  return readFileSync(join(process.cwd(), "tests/fixtures/sympla-brasilia.html"), "utf-8");
}

describe("parseSymplaEvents", () => {
  it("parses the Next.js flight payload into normalized events", () => {
    const events = parseSymplaEvents(loadFixture(), now);

    expect(events).toHaveLength(3);
    expect(events.map((e) => e.externalId)).toEqual(["3479998", "3464845", "3491027"]);

    const [first] = events;
    expect(first).toMatchObject({
      externalId: "3479998",
      title: "Deu Mó Love | 10.07 | Varanda do Contexto",
      locationName: "Contexto Bar e Restaurante",
      locationAddress: "SCES Trecho 2, Brasília - DF",
      organizer: "Contexto Bar & Restaurante",
      sourceUrl: "https://www.sympla.com.br/evento/deu-mo-love-10-07-varanda-do-contexto/3479998",
      price: null,
      soldOut: false,
    });
    expect(first.imageUrl).toContain("images.sympla.com.br");
    // 2026-07-10T21:00Z = 2026-07-10 18:00 in America/Sao_Paulo
    expect(first.dateStart.getMonth()).toBe(6);
    expect(first.dateStart.getDate()).toBe(10);
  });

  it("trims trailing whitespace from the event title", () => {
    const oscarito = parseSymplaEvents(loadFixture(), now).find((e) => e.externalId === "3491027")!;
    expect(oscarito.title).toBe("SEXTANEJADA NO OSCARITO");
  });

  it("drops events that have already passed and returns [] when there is no payload", () => {
    expect(parseSymplaEvents(loadFixture(), new Date("2026-08-01T00:00:00"))).toEqual([]);
    expect(parseSymplaEvents("<html><body>no data</body></html>", now)).toEqual([]);
  });
});
