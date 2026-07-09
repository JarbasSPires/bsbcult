import { describe, it, expect } from "vitest";
import { inferCategory } from "@/lib/scraper/infer-category";

describe("inferCategory", () => {
  it.each([
    ["Feira de Artesanato do Cerrado", "", "FEIRA"],
    ["Workshop de fotografia", "", "PALESTRA"],
    ["Festival Gastronômico de Brasília", "", "GASTRONOMIA"],
    ["Real Circo - espetáculo para toda a família", "", "INFANTIL"],
    ["Roda de choro na praça", "", "CULTURA_POPULAR"],
    ["Banda Aurora ao vivo", "show de rock autoral", "SHOW"],
    ["Peça: O Auto da Compadecida", "", "TEATRO"],
    ["Mostra de cinema latino", "", "CINEMA"],
    ["Exposição de arte moderna", "", "EXPOSICAO"],
    ["Encontro anual de colecionadores", "", "OUTRO"],
  ])("classifies %s as %s", (title, description, expected) => {
    expect(inferCategory(title, description)).toBe(expected);
  });

  it("is accent- and case-insensitive", () => {
    expect(inferCategory("FEIRA GASTRONÔMICA", "")).toBe("FEIRA");
  });
});
