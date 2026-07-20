import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseRoteiroBabyPosts } from "@/lib/scraper/adapters/roteiro-baby";

const now = new Date("2026-06-01T00:00:00");

function loadFixture() {
  const raw = readFileSync(join(process.cwd(), "tests/fixtures/roteiro-baby-posts.json"), "utf-8");
  return JSON.parse(raw);
}

describe("parseRoteiroBabyPosts", () => {
  it("splits both roundup posts into one event per 🔹 block, across both content shapes", () => {
    const events = parseRoteiroBabyPosts(loadFixture(), now);

    // Fixture post 88180 uses a literal emoji inside one <p> with <br>
    // separators (3 blocks); post 88174 uses <img alt="emoji"> with one <p>
    // per field (2 blocks) — both shapes must parse to 5 events total.
    expect(events).toHaveLength(5);
    expect(events.map((e) => e.externalId)).toEqual([
      "88180-0",
      "88180-1",
      "88180-2",
      "88174-0",
      "88174-1",
    ]);
  });

  it("resolves a single-day block's date and defaults category to INFANTIL when inference is inconclusive", () => {
    const event = parseRoteiroBabyPosts(loadFixture(), now).find((e) => e.externalId === "88180-0")!;

    expect(event).toMatchObject({
      title: "TREINO COLETIVO EMBAIXINHOS",
      locationName: "Em Frente À Embaixada Do México",
      organizer: "@embaixinhos",
      category: "INFANTIL",
      isFree: true,
      price: null,
    });
    expect(event.dateStart.getDay()).toBe(0); // domingo
    expect(event.dateStart.toDateString()).toBe(event.dateEnd.toDateString());
  });

  it("spans dateStart/dateEnd across a block's multiple 📅 weekday tokens (SÁB → DOM)", () => {
    const event = parseRoteiroBabyPosts(loadFixture(), now).find((e) => e.externalId === "88180-1")!;

    expect(event.title).toBe("FESTIVAL DE BOLHAS GIGANTES");
    expect(event.dateStart.getDay()).toBe(6); // sábado
    expect(event.dateEnd.getDay()).toBe(0); // domingo
    expect(event.dateStart.getTime()).toBeLessThan(event.dateEnd.getTime());
  });

  it("parses the <img alt=\"emoji\"> content shape (one <p> per field) the same as the inline-emoji shape", () => {
    const event = parseRoteiroBabyPosts(loadFixture(), now).find((e) => e.externalId === "88174-0")!;

    expect(event).toMatchObject({
      title: "FÉRIAS NO ITAMARATY",
      locationName: "Palácio Itamaraty",
      organizer: "@itamaratygovbr",
      isFree: true,
      // "oficinas" in the description outranks the INFANTIL default.
      category: "PALESTRA",
    });
    expect(event.description).not.toContain("🎟");
    expect(event.dateStart.getDay()).toBe(5); // sexta-feira
    expect(event.dateEnd.getDay()).toBe(0); // domingo
  });

  it("does not fold an untracked emoji-prefixed line (ticket instructions) into the description", () => {
    const event = parseRoteiroBabyPosts(loadFixture(), now).find((e) => e.externalId === "88174-1")!;
    expect(event.description).toBe("Museu interativo para aprender ciências brincando.");
    expect(event.category).toBe("FESTIVAL");
  });

  it("skips posts whose title isn't a Roteiro Baby agenda roundup", () => {
    const posts = [
      { id: 1, link: "https://roteirobaby.com.br/x/", title: { rendered: "Grátis | Oficina de teatro" }, content: { rendered: "🔹Algo<br>📅DOM<br>💲Grátis" } },
    ];
    expect(parseRoteiroBabyPosts(posts as never, now)).toEqual([]);
  });

  it("skips a block with no title or no resolvable weekday instead of throwing", () => {
    const posts = [
      {
        id: 99,
        link: "https://roteirobaby.com.br/y/",
        title: { rendered: "Roteiro Baby | Agenda infantil de Brasília para 6 a 8 de junho" },
        content: {
          rendered:
            "<p>🔹<br>Bloco sem título.<br>📅DOM<br>💲Grátis</p>" +
            "<p>🔹Sem data válida<br>Descrição.<br>💲Grátis</p>" +
            "<p>🔹Evento Ok<br>Descrição válida.<br>📅SEX<br>💲Grátis</p>",
        },
      },
    ];

    expect(() => parseRoteiroBabyPosts(posts as never, now)).not.toThrow();
    const events = parseRoteiroBabyPosts(posts as never, now);
    expect(events.map((e) => e.title)).toEqual(["Evento Ok"]);
  });
});
