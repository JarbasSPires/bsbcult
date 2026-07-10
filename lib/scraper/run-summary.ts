import type { RunResult } from "@/lib/scraper/upsert";

export interface RunSummary {
  okCount: number;
  failCount: number;
  eventCount: number;
  /**
   * The whole scrape run is only a failure when NO source succeeded — a
   * systemic problem (network/DB down, or every adapter broke). Sources that
   * fail descriptively on purpose (anti-bot blocks, unscrapeable portals) must
   * not turn an otherwise healthy run red, or a real regression in a working
   * source would be masked by the perennial red status.
   */
  failed: boolean;
}

export function summarizeRun(results: RunResult[]): RunSummary {
  const okResults = results.filter((r) => r.ok);
  const okCount = okResults.length;
  return {
    okCount,
    failCount: results.length - okCount,
    eventCount: okResults.reduce((sum, r) => sum + r.count, 0),
    failed: results.length > 0 && okCount === 0,
  };
}
