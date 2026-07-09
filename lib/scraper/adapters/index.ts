import type { EventSourceAdapter } from "@/lib/scraper/types";
import { arenaBrbAdapter } from "@/lib/scraper/adapters/arena-brb";
import { clubeDoChoroAdapter } from "@/lib/scraper/adapters/clube-do-choro";
import { sesiLabAdapter } from "@/lib/scraper/adapters/sesi-lab";
import { culturaDfAdapter } from "@/lib/scraper/adapters/cultura-df";
import { sescDfAdapter } from "@/lib/scraper/adapters/sesc-df";
import { expressaoBrasilienseAdapter } from "@/lib/scraper/adapters/expressao-brasiliense";

export const adapters: EventSourceAdapter[] = [
  arenaBrbAdapter,
  clubeDoChoroAdapter,
  sesiLabAdapter,
  culturaDfAdapter,
  sescDfAdapter,
  expressaoBrasilienseAdapter,
];
