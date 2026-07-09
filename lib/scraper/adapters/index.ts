import type { EventSourceAdapter } from "@/lib/scraper/types";
import { arenaBrbAdapter } from "@/lib/scraper/adapters/arena-brb";
import { clubeDoChoroAdapter } from "@/lib/scraper/adapters/clube-do-choro";
import { sesiLabAdapter } from "@/lib/scraper/adapters/sesi-lab";
import { caixaCulturalAdapter } from "@/lib/scraper/adapters/caixa-cultural";
import { toinhaAdapter } from "@/lib/scraper/adapters/toinha";
import { culturaDfAdapter } from "@/lib/scraper/adapters/cultura-df";
import { sescDfAdapter } from "@/lib/scraper/adapters/sesc-df";
import { expressaoBrasilienseAdapter } from "@/lib/scraper/adapters/expressao-brasiliense";
import { symplaAdapter } from "@/lib/scraper/adapters/sympla";
import { shotgunAdapter } from "@/lib/scraper/adapters/shotgun";

export const adapters: EventSourceAdapter[] = [
  arenaBrbAdapter,
  clubeDoChoroAdapter,
  sesiLabAdapter,
  caixaCulturalAdapter,
  toinhaAdapter,
  culturaDfAdapter,
  sescDfAdapter,
  expressaoBrasilienseAdapter,
  symplaAdapter,
  shotgunAdapter,
];
