import type { EventSourceAdapter, NormalizedEvent } from "@/lib/scraper/types";

// Escalation adapter (see plan Task 10).
//
// The plan's research expected caixacultural.gov.br/Paginas/Programacao.aspx to
// be server-rendered and to link events via ?idEvento=N. On the live site that no
// longer holds — it is a SharePoint (WebForms) shell whose entire visible SSR text
// is just "Programação … Selecione … Fechar":
//   - Programacao.aspx and its ?idEvento=N "detail" pages contain no SSR event
//     content (title/date/description are all rendered client-side); the idEvento
//     value only appears baked into the WebForms postback <form action>.
//   - The SharePoint list REST endpoints (/_api/web/lists, /_vti_bin/ListData.svc)
//     return HTTP 401 — auth-gated, not publicly readable.
//   - The Brasília unit page (Paginas/Brasilia.aspx) is near-empty (an Instagram
//     bio link and a contact email), with no event listing.
//
// Scraping this requires executing the page's JS (a headless browser) or
// authentication, which the fetch-based pipeline does not do. Rather than
// fabricate events, this source fails descriptively; runAdapter records the
// message in EventSource.lastRunError for a future revisit.
export const caixaCulturalAdapter: EventSourceAdapter = {
  slug: "caixa-cultural",
  name: "Caixa Cultural",
  baseUrl: "https://www.caixacultural.gov.br",
  adapterType: "HTML",

  async fetchEvents(): Promise<NormalizedEvent[]> {
    throw new Error(
      "Caixa Cultural não expõe uma listagem legível por máquina de eventos culturais datados " +
        "(site SharePoint com conteúdo renderizado por JS e REST de listas protegida por 401) — fonte requer revisão manual.",
    );
  },
};
