import { describe, it, expect } from "vitest";
import { buildIcsFile } from "@/lib/ics";

describe("buildIcsFile", () => {
  it("produces a valid VEVENT block with the expected fields", () => {
    const ics = buildIcsFile({
      id: "evt-1",
      title: "Show de Rock",
      description: "Uma noite de rock autoral",
      locationName: "CCBB Brasília",
      locationAddress: "SCES Trecho 2",
      dateStart: new Date("2026-08-01T20:00:00Z"),
      dateEnd: new Date("2026-08-01T23:00:00Z"),
    });

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("UID:evt-1@bsbcult.com.br");
    expect(ics).toContain("SUMMARY:Show de Rock");
    expect(ics).toContain("LOCATION:CCBB Brasília\\, SCES Trecho 2");
    expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("escapes commas, semicolons, and newlines in free-text fields", () => {
    const ics = buildIcsFile({
      id: "evt-2",
      title: "Evento; especial, com vírgula",
      description: "Linha 1\nLinha 2",
      locationName: "Local",
      locationAddress: "Endereço",
      dateStart: new Date("2026-08-01T20:00:00Z"),
      dateEnd: new Date("2026-08-01T23:00:00Z"),
    });

    expect(ics).toContain("SUMMARY:Evento\\; especial\\, com vírgula");
    expect(ics).toContain("DESCRIPTION:Linha 1\\nLinha 2");
  });
});
