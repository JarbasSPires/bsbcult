import type { EventSourceAdapter, NormalizedEvent } from "@/lib/scraper/types";

// Escalation adapter (see plan Task 8).
//
// After genuine investigation, the Secretaria de Cultura do DF portal exposes NO
// machine-readable listing of dated public cultural events:
//   - www.cultura.df.gov.br is a Liferay institutional NEWS portal — no WordPress
//     REST (/wp-json 404), no Liferay Objects/headless endpoint (unlike SESI Lab),
//     no "próximos eventos" list; its mini-calendar only filters news by date.
//   - The only "agenda" is /agenda-do-secretario — the secretary's PERSONAL
//     schedule, which is JS-rendered (empty in SSR) and is not public programming.
//   - https://www.df.gov.br/roteiro-cultural/ returns HTTP 404.
//
// Scraping undated news articles would fabricate events, which the plan forbids.
// This adapter therefore fails descriptively; runAdapter isolates the throw and
// records it in EventSource.lastRunError, keeping the source visible for a future
// revisit if the portal ever ships a real events listing.
export const culturaDfAdapter: EventSourceAdapter = {
  slug: "cultura-df",
  name: "Secretaria de Cultura do DF",
  baseUrl: "https://www.cultura.df.gov.br",
  adapterType: "HTML",

  async fetchEvents(): Promise<NormalizedEvent[]> {
    throw new Error(
      "Secretaria de Cultura do DF não expõe uma listagem legível por máquina de eventos culturais datados " +
        "(portal Liferay institucional de notícias, sem API de eventos) — fonte requer revisão manual.",
    );
  },
};
