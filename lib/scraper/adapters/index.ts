import type { EventSourceAdapter } from "@/lib/scraper/types";
import { arenaBrbAdapter } from "@/lib/scraper/adapters/arena-brb";
import { clubeDoChoroAdapter } from "@/lib/scraper/adapters/clube-do-choro";
import { expressaoBrasilienseAdapter } from "@/lib/scraper/adapters/expressao-brasiliense";

export const adapters: EventSourceAdapter[] = [
  arenaBrbAdapter,
  clubeDoChoroAdapter,
  expressaoBrasilienseAdapter,
];
