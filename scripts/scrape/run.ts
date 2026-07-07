import "dotenv/config";
import { adapters } from "../../lib/scraper/adapters";
import { runAdapter } from "../../lib/scraper/upsert";

async function main() {
  let hasFailure = false;

  for (const adapter of adapters) {
    const result = await runAdapter(adapter);
    if (result.ok) {
      console.log(`[${result.slug}] OK — ${result.count} eventos processados`);
    } else {
      hasFailure = true;
      console.error(`[${result.slug}] ERRO — ${result.error}`);
    }
  }

  if (hasFailure) {
    process.exitCode = 1;
  }
}

main();
