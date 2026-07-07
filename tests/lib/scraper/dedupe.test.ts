import { describe, it, expect } from "vitest";
import { findCrossSourceDuplicate } from "@/lib/scraper/dedupe";

const existing = [
  { id: "evt-1", title: "Real Circo - Brasília", locationName: "Arena BRB Mané Garrincha", dateStart: new Date("2026-04-17T20:00:00") },
];

describe("findCrossSourceDuplicate", () => {
  it("matches on normalized title + location + same day", () => {
    const match = findCrossSourceDuplicate(
      { title: "REAL CIRCO - BRASÍLIA!", locationName: "arena brb mané garrincha", dateStart: new Date("2026-04-17T09:00:00") },
      existing
    );
    expect(match?.id).toBe("evt-1");
  });

  it("does not match when the date differs", () => {
    const match = findCrossSourceDuplicate(
      { title: "Real Circo - Brasília", locationName: "Arena BRB Mané Garrincha", dateStart: new Date("2026-04-18T20:00:00") },
      existing
    );
    expect(match).toBeNull();
  });

  it("does not match when the location differs", () => {
    const match = findCrossSourceDuplicate(
      { title: "Real Circo - Brasília", locationName: "Clube do Choro", dateStart: new Date("2026-04-17T20:00:00") },
      existing
    );
    expect(match).toBeNull();
  });
});
