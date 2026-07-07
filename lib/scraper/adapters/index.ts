import type { EventSourceAdapter } from "@/lib/scraper/types";
import { arenaBrbAdapter } from "@/lib/scraper/adapters/arena-brb";
import { clubeDoChoroAdapter } from "@/lib/scraper/adapters/clube-do-choro";

export const adapters: EventSourceAdapter[] = [arenaBrbAdapter, clubeDoChoroAdapter];
