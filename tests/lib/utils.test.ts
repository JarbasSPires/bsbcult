import { describe, it, expect } from "vitest";
import {
  formatPrice,
  formatEventDate,
  parseTags,
  serializeTags,
} from "@/lib/utils";

describe("formatPrice", () => {
  it("returns 'Gratuito' when isFree is true", () => {
    expect(formatPrice(50, true)).toBe("Gratuito");
  });

  it("returns 'Gratuito' when price is null", () => {
    expect(formatPrice(null, false)).toBe("Gratuito");
  });

  it("formats a paid price as BRL currency", () => {
    // Node's ICU/CLDR data renders a non-breaking space (U+00A0) between
    // the currency symbol and the amount for pt-BR, not a regular space.
    expect(formatPrice(89.9, false)).toBe("R$ 89,90");
  });
});

describe("formatEventDate", () => {
  it("formats a date in pt-BR short form", () => {
    const date = new Date("2026-08-15T20:30:00");
    const result = formatEventDate(date);
    expect(result).toContain("ago");
    expect(result).toContain("20:30");
  });
});

describe("tags serialization", () => {
  it("round-trips an array of tags", () => {
    const tags = ["rock", "ao vivo"];
    expect(parseTags(serializeTags(tags))).toEqual(tags);
  });

  it("returns an empty array for malformed JSON", () => {
    expect(parseTags("not json")).toEqual([]);
  });
});
