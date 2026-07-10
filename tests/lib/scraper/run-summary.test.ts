import { describe, it, expect } from "vitest";
import { summarizeRun } from "@/lib/scraper/run-summary";
import type { RunResult } from "@/lib/scraper/upsert";

const ok = (slug: string, count: number): RunResult => ({ slug, ok: true, count });
const fail = (slug: string): RunResult => ({ slug, ok: false, count: 0, error: "erro descritivo" });

describe("summarizeRun", () => {
  it("is not a failed run when at least one source succeeds, even if others fail", () => {
    // Mirrors production: some sources are intentionally unscrapeable and fail
    // descriptively — the run is still healthy as long as one source delivered.
    const summary = summarizeRun([ok("arena-brb", 6), fail("cultura-df"), fail("shotgun")]);
    expect(summary.failed).toBe(false);
    expect(summary.okCount).toBe(1);
    expect(summary.failCount).toBe(2);
    expect(summary.eventCount).toBe(6);
  });

  it("is a failed run only when every source fails (systemic problem)", () => {
    expect(summarizeRun([fail("a"), fail("b")]).failed).toBe(true);
  });

  it("sums event counts across the successful sources", () => {
    expect(summarizeRun([ok("a", 6), ok("b", 25), fail("c")]).eventCount).toBe(31);
  });

  it("treats an empty run as not failed", () => {
    expect(summarizeRun([]).failed).toBe(false);
  });
});
