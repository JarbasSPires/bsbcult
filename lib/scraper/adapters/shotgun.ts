import type { EventSourceAdapter, NormalizedEvent } from "@/lib/scraper/types";
import { endOfDay, isoToSaoPauloDate } from "@/lib/scraper/normalize";
import { inferCategory } from "@/lib/scraper/infer-category";
import { fetchHtmlViaCurl } from "@/lib/scraper/curl-fetch";

// Shotgun (Next.js) renders the Infinu venue's event cards into the SSR HTML.
// Each card is anchored by an <a href="/pt-br/events/<slug>"> and carries an
// <img alt="title">, a <time dateTime="<ISO>">, a "R$ x,yz" price and genre tags.
//
// Fetched via curl (see curl-fetch.ts) rather than fetch — Shotgun's anti-bot
// blocks Node's fetch with 429 but allows curl from the same IP/network.
const VENUE_URL = "https://shotgun.live/pt-br/venues/infinu-comunidade-criativa";
const EVENT_BASE = "https://shotgun.live/pt-br/events";
const FALLBACK_IMAGE = "https://shotgun.live/favicon.ico";
const VENUE_NAME = "Infinu Comunidade Criativa";
const VENUE_ADDRESS = "CRS 506 Bloco A Loja 67, Asa Sul, Brasília - DF";

export const shotgunAdapter: EventSourceAdapter = {
  slug: "shotgun",
  name: "Infinu (Shotgun)",
  baseUrl: "https://shotgun.live",
  adapterType: "HTML",

  async fetchEvents(): Promise<NormalizedEvent[]> {
    const html = await fetchHtmlViaCurl(VENUE_URL, "Shotgun");
    return parseShotgunEvents(html);
  },
};

const LINK_RE = /href="\/pt-br\/events\/([a-z0-9-]+)"/g;

function parsePrice(cardHtml: string): number | null {
  const match = cardHtml.match(/R\$\s*([\d.]*\d,\d{2})/);
  if (!match) return null;
  const value = Number(match[1].replace(/\./g, "").replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

function extractTags(cardHtml: string): string[] {
  const tags: string[] = [];
  const re = /text-2xs h-6">([^<]+)</g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cardHtml)) !== null) tags.push(m[1].trim());
  return tags;
}

export function parseShotgunEvents(html: string, now: Date = new Date()): NormalizedEvent[] {
  const anchors: { index: number; slug: string }[] = [];
  let m: RegExpExecArray | null;
  LINK_RE.lastIndex = 0;
  while ((m = LINK_RE.exec(html)) !== null) {
    anchors.push({ index: m.index, slug: m[1] });
  }

  const events: NormalizedEvent[] = [];
  const seen = new Set<string>();
  for (let n = 0; n < anchors.length; n++) {
    const slug = anchors[n].slug;
    if (seen.has(slug)) continue;
    const card = html.slice(anchors[n].index, anchors[n + 1]?.index ?? anchors[n].index + 2500);
    const event = parseCard(slug, card, now);
    if (event) {
      seen.add(slug);
      events.push(event);
    }
  }
  return events;
}

function parseCard(slug: string, card: string, now: Date): NormalizedEvent | null {
  try {
    const title = (card.match(/alt="([^"]{2,160})"/)?.[1] ?? "").trim();
    const iso = card.match(/dateTime="([^"]+)"/)?.[1];
    const dateStart = isoToSaoPauloDate(iso);
    if (!title || !dateStart) return null;

    const dateEnd = endOfDay(dateStart);
    if (dateEnd < now) return null;

    const tags = extractTags(card);
    const price = parsePrice(card);
    const image = card.match(/https:\/\/res\.cloudinary\.com\/[^\s"']+?\.(?:jpe?g|png|webp)/i)?.[0];
    const inferred = inferCategory(title, tags.join(" "));
    // Music/cultural venue: default to SHOW when inference is inconclusive.
    const category = inferred === "OUTRO" ? "SHOW" : inferred;

    return {
      externalId: slug,
      title,
      description:
        tags.length > 0
          ? `${title} — ${tags.join(", ")}. No Infinu Comunidade Criativa.`
          : `${title} — no Infinu Comunidade Criativa.`,
      category,
      imageUrl: image ?? FALLBACK_IMAGE,
      locationName: VENUE_NAME,
      locationAddress: VENUE_ADDRESS,
      dateStart,
      dateEnd,
      price,
      isFree: price === 0 || /gratuit|gr[aá]tis/i.test(card),
      organizer: VENUE_NAME,
      tags: ["infinu", ...tags.map((t) => t.toLowerCase())],
      sourceUrl: `${EVENT_BASE}/${slug}`,
      ageRating: null,
      soldOut: /esgotado|sold\s?out/i.test(card),
    };
  } catch (error) {
    console.warn(
      `[shotgun] Falha ao processar evento "${slug}": ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }
}
