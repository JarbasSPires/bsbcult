import { describe, it, expect } from "vitest";
import { parseSlashDate, parseDayMonthWithRollover, parsePtBrDate, isoToSaoPauloDate, endOfDay, slugFromUrl } from "@/lib/scraper/normalize";

describe("parseSlashDate", () => {
  it("parses DD/MM/YY into a Date", () => {
    const date = parseSlashDate("08/03/26");
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(2);
    expect(date.getDate()).toBe(8);
  });

  it("throws on an unexpected format", () => {
    expect(() => parseSlashDate("not-a-date")).toThrow();
  });
});

describe("parseDayMonthWithRollover", () => {
  it("keeps the current year when the date is still upcoming", () => {
    const now = new Date("2026-06-01T00:00:00");
    const date = parseDayMonthWithRollover(10, 7, now);
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(6);
    expect(date.getDate()).toBe(10);
  });

  it("rolls over to next year when the date is more than 30 days in the past", () => {
    const now = new Date("2026-06-01T00:00:00");
    const date = parseDayMonthWithRollover(1, 1, now);
    expect(date.getFullYear()).toBe(2027);
  });
});

describe("parsePtBrDate", () => {
  const now = new Date("2026-06-01T00:00:00");

  it("extracts a 'DD de <mês>' date from free-form text", () => {
    const date = parsePtBrDate("Arraiá no dia 20 de junho no Setor de Clubes Sul", now);
    expect(date).not.toBeNull();
    expect(date!.getMonth()).toBe(5);
    expect(date!.getDate()).toBe(20);
  });

  it("is accent- and case-insensitive for month names", () => {
    const date = parsePtBrDate("acontece em 5 de MARÇO", now);
    expect(date!.getMonth()).toBe(2);
    expect(date!.getDate()).toBe(5);
  });

  it("extracts a DD/MM date and applies rollover to the current year when upcoming", () => {
    const date = parsePtBrDate("evento em 15/08", now);
    expect(date!.getFullYear()).toBe(2026);
    expect(date!.getMonth()).toBe(7);
    expect(date!.getDate()).toBe(15);
  });

  it("respects an explicit DD/MM/YY year", () => {
    const date = parsePtBrDate("remarcado para 03/01/27", now);
    expect(date!.getFullYear()).toBe(2027);
    expect(date!.getMonth()).toBe(0);
    expect(date!.getDate()).toBe(3);
  });

  it("rolls a long-past 'DD de <mês>' date into next year", () => {
    const date = parsePtBrDate("foi em 1 de janeiro", now);
    expect(date!.getFullYear()).toBe(2027);
  });

  it("returns null when no date pattern is present", () => {
    expect(parsePtBrDate("Uma nota sem qualquer data", now)).toBeNull();
  });

  it("ignores a bare DD/MM with no date cue (score, ratio, registration range)", () => {
    expect(parsePtBrDate("avaliação nota 9/10 no evento", now)).toBeNull();
    expect(parsePtBrDate("inscrições de 10/05 a 20/06", now)).toBeNull();
  });

  it("accepts a bare DD/MM only when preceded by a date cue", () => {
    const date = parsePtBrDate("acontece no dia 20/06 no parque", now);
    expect(date).not.toBeNull();
    expect(date!.getMonth()).toBe(5);
    expect(date!.getDate()).toBe(20);
  });
});

describe("isoToSaoPauloDate", () => {
  it("reads the Brasília calendar day from an evening UTC instant", () => {
    // 2026-08-15T23:00Z = 2026-08-15 20:00 in America/Sao_Paulo (UTC-3)
    const d = isoToSaoPauloDate("2026-08-15T23:00:00.000Z");
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(7);
    expect(d!.getDate()).toBe(15);
  });

  it("rolls back to the previous day for an early-UTC instant", () => {
    // 2026-08-16T02:00Z = 2026-08-15 23:00 in America/Sao_Paulo
    expect(isoToSaoPauloDate("2026-08-16T02:00:00.000Z")!.getDate()).toBe(15);
  });

  it("returns null for a missing or unparseable value", () => {
    expect(isoToSaoPauloDate(undefined)).toBeNull();
    expect(isoToSaoPauloDate("not-a-date")).toBeNull();
  });
});

describe("endOfDay", () => {
  it("sets the time to 23:59", () => {
    const date = endOfDay(new Date("2026-07-10T08:00:00"));
    expect(date.getHours()).toBe(23);
    expect(date.getMinutes()).toBe(59);
    expect(date.getDate()).toBe(10);
  });
});

describe("slugFromUrl", () => {
  it("extracts the last path segment", () => {
    expect(slugFromUrl("https://arenabsb.com.br/agendas/tour-nosso-mane/")).toBe("tour-nosso-mane");
  });

  it("throws when there is no usable segment", () => {
    expect(() => slugFromUrl("https://example.com/")).toThrow();
  });
});
