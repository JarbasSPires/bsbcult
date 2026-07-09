import { describe, it, expect } from "vitest";
import { parseSlashDate, parseDayMonthWithRollover, parsePtBrDate, endOfDay, slugFromUrl } from "@/lib/scraper/normalize";

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
