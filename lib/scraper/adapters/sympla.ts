import type { EventSourceAdapter, NormalizedEvent } from "@/lib/scraper/types";
import { endOfDay, isoToSaoPauloDate } from "@/lib/scraper/normalize";
import { inferCategory } from "@/lib/scraper/infer-category";
import { fetchHtmlViaCurl } from "@/lib/scraper/curl-fetch";

// Sympla's Brasília listing is a Next.js App Router page: the event objects are
// embedded (JSON-string-escaped) inside the RSC flight payload (self.__next_f).
// `category=city` is Sympla's "eventos na cidade" tab (all local events, as
// opposed to a specific category like courses/shows) and is fetched via curl
// (see curl-fetch.ts) for the same anti-bot resilience as the Shotgun adapter.
const LIST_URL = "https://www.sympla.com.br/eventos/brasilia-df?category=city";
const FALLBACK_IMAGE = "https://www.sympla.com.br/favicon.ico";

interface SymplaLocation {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
}

interface SymplaEvent {
  id?: number;
  name?: string;
  url?: string;
  start_date?: string;
  end_date?: string;
  location?: SymplaLocation;
  images?: { lg?: string; original?: string; xs?: string };
  organizer?: { name?: string };
}

export const symplaAdapter: EventSourceAdapter = {
  slug: "sympla",
  name: "Sympla Brasília",
  baseUrl: "https://www.sympla.com.br",
  adapterType: "HTML",

  async fetchEvents(): Promise<NormalizedEvent[]> {
    const html = await fetchHtmlViaCurl(LIST_URL, "Sympla");
    return parseSymplaEvents(html);
  },
};

// Walks the (un-escaped) flight text, bracket-matching each event object around
// its `"start_date"` anchor. Deduplicates by id since the payload repeats some
// cards. Tolerant of the surrounding non-JSON markup.
function extractEvents(html: string): SymplaEvent[] {
  const text = html.replace(/\\"/g, '"');
  const anchor = '"start_date":"';
  const events: SymplaEvent[] = [];
  const seen = new Set<number>();
  let idx = 0;
  while ((idx = text.indexOf(anchor, idx)) !== -1) {
    // Walk back to the opening brace of the object holding this start_date.
    let start = idx;
    let backDepth = 0;
    for (; start >= 0; start--) {
      if (text[start] === "}") backDepth++;
      else if (text[start] === "{") {
        if (backDepth === 0) break;
        backDepth--;
      }
    }
    // Walk forward to its matching closing brace.
    let end = start;
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (; end < text.length; end++) {
      const c = text[end];
      if (esc) {
        esc = false;
        continue;
      }
      if (c === "\\") {
        esc = true;
        continue;
      }
      if (c === '"') inStr = !inStr;
      if (inStr) continue;
      if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0) {
          end++;
          break;
        }
      }
    }
    try {
      const obj = JSON.parse(text.slice(start, end)) as SymplaEvent;
      if (obj && obj.id != null && obj.start_date && (obj.url ?? "").includes("/evento/") && !seen.has(obj.id)) {
        seen.add(obj.id);
        events.push(obj);
      }
    } catch {
      // not a clean event object — keep scanning
    }
    idx += anchor.length;
  }
  return events;
}

export function parseSymplaEvents(html: string, now: Date = new Date()): NormalizedEvent[] {
  return extractEvents(html)
    .map((event) => parseEvent(event, now))
    .filter((event): event is NormalizedEvent => event !== null);
}

function parseEvent(event: SymplaEvent, now: Date): NormalizedEvent | null {
  try {
    const title = (event.name ?? "").trim();
    if (!title || !event.url) return null;

    const dateStart = isoToSaoPauloDate(event.start_date);
    if (!dateStart) return null;

    const dateEnd = endOfDay(isoToSaoPauloDate(event.end_date) ?? dateStart);
    if (dateEnd < now) return null;

    const loc = event.location ?? {};
    const city = loc.city?.trim() || "Brasília";
    const state = loc.state?.trim() || "DF";
    const addressParts = [loc.address?.trim(), `${city} - ${state}`].filter(Boolean);

    return {
      externalId: String(event.id),
      title,
      description: `${title} — evento em ${city} - ${state}. Ingressos e detalhes no Sympla.`,
      category: inferCategory(title, ""),
      imageUrl: event.images?.lg ?? event.images?.original ?? FALLBACK_IMAGE,
      locationName: loc.name?.trim() || `${city} - ${state}`,
      locationAddress: addressParts.join(", "),
      dateStart,
      dateEnd,
      price: null,
      isFree: /gratuit|gr[aá]tis/i.test(title),
      organizer: event.organizer?.name?.trim() || "via Sympla",
      tags: ["sympla"],
      sourceUrl: event.url,
      ageRating: null,
      soldOut: false,
    };
  } catch (error) {
    console.warn(
      `[sympla] Falha ao processar evento ${event?.id ?? "desconhecido"}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }
}
