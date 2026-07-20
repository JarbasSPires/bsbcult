import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseDeboaEventos } from "@/lib/scraper/adapters/deboa";

const now = new Date("2026-07-20T00:00:00");

function loadFixture() {
  const raw = readFileSync(join(process.cwd(), "tests/fixtures/deboa-eventos.json"), "utf-8");
  return JSON.parse(raw);
}

describe("parseDeboaEventos", () => {
  it("skips a post with no Data:/Horário:/Local: block instead of fabricating a date", () => {
    const events = parseDeboaEventos(loadFixture(), now);

    // Fixture has 4 posts: 3 real events + one listicle post with no Mais
    // Informações block, which must be dropped.
    expect(events).toHaveLength(3);
    expect(events.some((e) => e.externalId === "61268")).toBe(false);
  });

  it("parses a single-date event, taking the lowest Ingressos price", () => {
    const event = parseDeboaEventos(loadFixture(), now).find((e) => e.externalId === "61462")!;

    expect(event).toMatchObject({
      externalId: "61462",
      title: "Noite Dominicana na Oca do Lago em Brasília",
      locationName: "Oca do Lago – Orla da Concha Acústica",
      price: 30,
      isFree: false,
      ageRating: null,
      organizer: "De Boa Brasília",
      sourceUrl: "https://brasilia.deboa.com/brasilia/festa-show/festas-shows-em-brasilia/noite-dominicana-na-oca-do-lago-em-brasilia/",
    });
    expect(event.imageUrl).toContain("Noite-Dominicana");
    expect(event.dateStart.getMonth()).toBe(6);
    expect(event.dateStart.getDate()).toBe(30);
    expect(event.dateEnd.getDate()).toBe(30);
  });

  it("parses a same-month date range and marks Entrada gratuita as free", () => {
    const event = parseDeboaEventos(loadFixture(), now).find((e) => e.externalId === "61425")!;

    expect(event.dateStart.getDate()).toBe(25);
    expect(event.dateEnd.getDate()).toBe(26);
    expect(event.isFree).toBe(true);
    expect(event.price).toBeNull();
    expect(event.locationName).toContain("Infinu");
  });

  it("parses a cross-month date range and captures the Classificação as ageRating", () => {
    const event = parseDeboaEventos(loadFixture(), now).find((e) => e.externalId === "61449")!;

    expect(event.dateStart.getMonth()).toBe(6);
    expect(event.dateStart.getDate()).toBe(30);
    expect(event.dateEnd.getMonth()).toBe(7);
    expect(event.dateEnd.getDate()).toBe(2);
    expect(event.ageRating).toBe("14 anos");
    // "Ingresso" (singular) header is still recognized; lowest of 90/140/180 is 90.
    expect(event.price).toBe(90);
  });

  it("skips a malformed post instead of throwing or discarding the batch", () => {
    const posts = [
      { id: 1, title: { rendered: "Sem conteúdo" }, content: { rendered: "" }, excerpt: { rendered: "" }, link: "https://brasilia.deboa.com/x/" },
      {
        id: 2,
        title: { rendered: "Evento Válido" },
        content: { rendered: "<h3>Mais Informações</h3><p>Data: 15 de agosto de 2026<br />Local: Teste</p>" },
        excerpt: { rendered: "<p>Descrição.</p>" },
        link: "https://brasilia.deboa.com/y/",
      },
    ];

    expect(() => parseDeboaEventos(posts as never, now)).not.toThrow();
    expect(parseDeboaEventos(posts as never, now).map((e) => e.externalId)).toEqual(["2"]);
  });
});
