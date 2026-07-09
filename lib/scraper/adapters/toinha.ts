import type { EventSourceAdapter, NormalizedEvent } from "@/lib/scraper/types";
import { endOfDay } from "@/lib/scraper/normalize";
import { inferCategory } from "@/lib/scraper/infer-category";

// Toinha is a Wix site running the Wix Events app. The /event-list page embeds
// the full event objects as JSON (an "events":[...] array) in its SSR markup.
const LIST_URL = "https://www.toinhabrasilshow.com/event-list";
const DETAIL_BASE = "https://www.toinhabrasilshow.com/event-details";
const FALLBACK_IMAGE = "https://static.wixstatic.com/media/toinha-logo.png";
const DEFAULT_LOCATION = "Toinha Brasil Show";
const DEFAULT_ADDRESS = "SOF Sul Quadra 9, Guará, Brasília - DF";
// Brazil has no DST since 2019, so America/Sao_Paulo is a fixed UTC-3.
const SAO_PAULO_OFFSET_MS = 3 * 60 * 60 * 1000;

interface WixEvent {
  slug?: string;
  title?: string;
  description?: string;
  scheduling?: { config?: { startDate?: string } };
  location?: { name?: string; address?: string };
  mainImage?: { url?: string };
}

export const toinhaAdapter: EventSourceAdapter = {
  slug: "toinha",
  name: "Toinha Brasil Show",
  baseUrl: "https://www.toinhabrasilshow.com",
  adapterType: "HTML",

  async fetchEvents(): Promise<NormalizedEvent[]> {
    const response = await fetch(LIST_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
    });
    if (!response.ok) {
      throw new Error(`Toinha Brasil Show respondeu ${response.status}`);
    }
    return parseToinhaEvents(await response.text());
  },
};

// Reads the Brasília calendar day from a UTC ISO instant (evening shows stored
// as UTC), so the day never shifts regardless of where the scraper runs.
function saoPauloDate(iso: string | undefined): Date | null {
  const t = iso ? Date.parse(iso) : NaN;
  if (Number.isNaN(t)) return null;
  const local = new Date(t - SAO_PAULO_OFFSET_MS);
  return new Date(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
}

// Bracket-matches the first `"events":[ ... ]` JSON array that actually holds
// Wix event objects (slug + title), tolerating the surrounding minified markup.
function extractEventsArray(html: string): WixEvent[] {
  const key = '"events":';
  let idx = 0;
  while ((idx = html.indexOf(key, idx)) !== -1) {
    const start = html.indexOf("[", idx + key.length);
    if (start === -1) {
      idx += key.length;
      continue;
    }
    let depth = 0;
    let inStr = false;
    let esc = false;
    let i = start;
    for (; i < html.length; i++) {
      const c = html[i];
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
      if (c === "[") depth++;
      else if (c === "]") {
        depth--;
        if (depth === 0) {
          i++;
          break;
        }
      }
    }
    try {
      const arr = JSON.parse(html.slice(start, i));
      if (Array.isArray(arr) && arr.some((e) => e && e.slug && e.title)) {
        return arr as WixEvent[];
      }
    } catch {
      // not the array we want — keep scanning
    }
    idx = start + 1;
  }
  return [];
}

export function parseToinhaEvents(html: string, now: Date = new Date()): NormalizedEvent[] {
  return extractEventsArray(html)
    .map((event) => parseEvent(event, now))
    .filter((event): event is NormalizedEvent => event !== null);
}

function parseEvent(event: WixEvent, now: Date): NormalizedEvent | null {
  try {
    const title = (event.title ?? "").trim();
    const slug = (event.slug ?? "").trim();
    if (!title || !slug) return null;

    const dateStart = saoPauloDate(event.scheduling?.config?.startDate);
    if (!dateStart) return null;

    const dateEnd = endOfDay(dateStart);
    if (dateEnd < now) return null;

    const description = (event.description ?? "").trim();
    // Rock/metal venue: fall back to SHOW when keyword inference is inconclusive.
    const inferred = inferCategory(title, description);
    const category = inferred === "OUTRO" ? "SHOW" : inferred;

    return {
      externalId: slug,
      title,
      description: description || "Show na Toinha Brasil Show. Mais detalhes no link.",
      category,
      imageUrl: event.mainImage?.url ?? FALLBACK_IMAGE,
      locationName: event.location?.name?.trim() || DEFAULT_LOCATION,
      locationAddress: event.location?.address?.trim() || DEFAULT_ADDRESS,
      dateStart,
      dateEnd,
      price: null,
      isFree: /gratuit|gr[aá]tis/i.test(`${title} ${description}`),
      organizer: "Toinha Brasil Show",
      tags: ["toinha brasil show"],
      sourceUrl: `${DETAIL_BASE}/${slug}`,
      ageRating: null,
      soldOut: false,
    };
  } catch (error) {
    console.warn(
      `[toinha] Falha ao processar evento "${event?.slug ?? "desconhecido"}": ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }
}
