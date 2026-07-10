import "dotenv/config";
import { adapters } from "../../lib/scraper/adapters";
import { runAdapter, type RunResult } from "../../lib/scraper/upsert";
import { summarizeRun } from "../../lib/scraper/run-summary";

async function main() {
  const results: RunResult[] = [];

  for (const adapter of adapters) {
    const result = await runAdapter(adapter);
    if (result.ok) {
      console.log(`[${result.slug}] OK — ${result.count} eventos processados`);
    } else {
      console.error(`[${result.slug}] ERRO — ${result.error}`);
    }
    results.push(result);
  }

  const summary = summarizeRun(results);
  console.log(
    `\nResumo: ${summary.okCount} OK, ${summary.failCount} ERRO — ${summary.eventCount} eventos processados`,
  );

  // Only fail the run on a systemic problem (no source succeeded). Sources that
  // fail descriptively on purpose must not turn a healthy run red.
  if (summary.failed) {
    console.error("Nenhuma fonte funcionou — falha sistêmica do scrape.");
    process.exitCode = 1;
  }
}

main();
