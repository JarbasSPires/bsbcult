import type { EventSourceAdapter, NormalizedEvent } from "@/lib/scraper/types";

// Escalation adapter (see plan Task 9).
//
// The plan's research note expected sescdf.com.br/eventos to be server-rendered
// with real content, but the live site (a rebuilt Liferay DXP portal) no longer
// is: after genuine investigation there is NO machine-readable listing of dated
// cultural events.
//   - /eventos ships only navigation and a hero banner in SSR; the event list
//     (`cards-container`) is empty and hydrated client-side (Senna.js SPA). No
//     public data endpoint is exposed — no WordPress REST, no Liferay Objects
//     (/o/c/...) endpoint (unlike SESI Lab), no headless-delivery content feed;
//     the only fetch() in the page targets the logged-in user account, and the
//     agenda is effectively gated behind SESC "credenciamento".
//   - /programacaocultural renders no event content in SSR.
//   - /cultura is an edital page (inscription/realization periods, not an agenda).
//   - The homepage only carries news headlines with incidental dates.
//
// Rather than fabricate events from news, this source fails descriptively;
// runAdapter isolates the throw and records it in EventSource.lastRunError so the
// source stays visible for a revisit if a real listing/API appears.
export const sescDfAdapter: EventSourceAdapter = {
  slug: "sesc-df",
  name: "SESC-DF",
  baseUrl: "https://www.sescdf.com.br",
  adapterType: "HTML",

  async fetchEvents(): Promise<NormalizedEvent[]> {
    throw new Error(
      "SESC-DF não expõe uma listagem legível por máquina de eventos culturais datados " +
        "(portal Liferay SPA; a agenda de /eventos é hidratada via JS e depende de credenciamento) — fonte requer revisão manual.",
    );
  },
};
