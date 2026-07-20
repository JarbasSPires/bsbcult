import he from "he";
import type { EventSourceAdapter, NormalizedEvent } from "@/lib/scraper/types";
import { extractPtBrDateRange, endOfDay } from "@/lib/scraper/normalize";
import { inferCategory } from "@/lib/scraper/infer-category";

// De Boa Brasília is a WordPress site exposing a dedicated "eventos" custom
// post type via the REST API. Each post's content ends with a "Mais
// Informações" block of plain <div>/<br>-separated lines:
//   Data: 30 de julho a 2 de agosto de 2026, quinta-feira a domingo
//   Horário: ...
//   Local: Teatro UNIP – SGAS 913 – Asa Sul
//   Classificação: 14 anos            (optional)
// Posts without this block (news-style listicles, not single dated events)
// are skipped rather than guessed at.
const API_URL = "https://brasilia.deboa.com/wp-json/wp/v2/eventos?per_page=100&_embed=wp:featuredmedia";
const FALLBACK_IMAGE = "https://brasilia.deboa.com/favicon.ico";
const ORGANIZER = "De Boa Brasília";
const DEFAULT_CITY = "Brasília - DF";

interface WPPost {
  id: number;
  link: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  _embedded?: { "wp:featuredmedia"?: { source_url: string }[] };
}

export const deboaAdapter: EventSourceAdapter = {
  slug: "deboa",
  name: "De Boa Brasília",
  baseUrl: "https://brasilia.deboa.com",
  adapterType: "WORDPRESS",

  async fetchEvents(): Promise<NormalizedEvent[]> {
    const response = await fetch(API_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BsbCultBot/1.0)" },
    });
    if (!response.ok) {
      throw new Error(`De Boa Brasília API respondeu ${response.status}`);
    }
    return parseDeboaEventos(await response.json());
  },
};

// Converts to plain text, inserting a newline at <br> and at block-element
// boundaries (</p>, </div>, </h3>, </li>) — independent of whether the source
// HTML happens to be pretty-printed with real newlines between tags, since
// minified HTML would otherwise merge adjacent lines (e.g. a heading and the
// paragraph right after it) into one unmatched string.
function stripTags(html: string): string {
  return he
    .decode(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

// The Ingressos/Ingresso section sits between its <h3> heading and the next
// <h3>. Returns { isFree, price } — price is the lowest "R$ x,yz" found, or
// null when the section is absent or explicitly says free/not found.
function parsePrice(rawHtml: string): { isFree: boolean; price: number | null } {
  const start = rawHtml.search(/<h3>\s*Ingressos?\s*<\/h3>/i);
  if (start === -1) return { isFree: false, price: null };
  const afterStart = start + rawHtml.slice(start).indexOf("</h3>") + "</h3>".length;
  const nextHeading = rawHtml.indexOf("<h3", afterStart);
  const section = stripTags(rawHtml.slice(afterStart, nextHeading === -1 ? undefined : nextHeading));

  if (/gratuit/i.test(section)) return { isFree: true, price: null };

  const priceRe = /R\$\s*([\d.]*\d,\d{2})/g;
  const prices: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = priceRe.exec(section)) !== null) {
    prices.push(Number(m[1].replace(/\./g, "").replace(",", ".")));
  }
  if (prices.length === 0) return { isFree: false, price: null };
  return { isFree: false, price: Math.min(...prices) };
}

export function parseDeboaEventos(posts: WPPost[], now: Date = new Date()): NormalizedEvent[] {
  return posts
    .map((post) => parseEvent(post, now))
    .filter((event): event is NormalizedEvent => event !== null);
}

function parseEvent(post: WPPost, now: Date): NormalizedEvent | null {
  try {
    const title = he.decode(post.title?.rendered ?? "").trim();
    const rawContent = post.content?.rendered ?? "";
    const infoIdx = rawContent.indexOf("Mais Informa");
    if (!title || infoIdx === -1) return null;

    const infoLines = stripTags(rawContent.slice(infoIdx))
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const dataLine = infoLines.find((l) => /^Data:/i.test(l));
    if (!dataLine) return null;
    const range = extractPtBrDateRange(dataLine.replace(/^Data:\s*/i, ""), now);
    if (!range) return null;

    const localLine = infoLines.find((l) => /^Local:/i.test(l));
    const locationName = localLine?.replace(/^Local:\s*/i, "").trim() || DEFAULT_CITY;

    const classificacaoLine = infoLines.find((l) => /^Classifica[cç][aã]o:/i.test(l));
    const ageRating = classificacaoLine?.replace(/^Classifica[cç][aã]o:\s*/i, "").trim() || null;

    const { isFree, price } = parsePrice(rawContent);
    const description = stripTags(post.excerpt?.rendered ?? "") || `${title}. Mais detalhes no link.`;

    return {
      externalId: String(post.id),
      title,
      description,
      category: inferCategory(title, description),
      imageUrl: post._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? FALLBACK_IMAGE,
      locationName,
      locationAddress: `${locationName}, ${DEFAULT_CITY}`,
      dateStart: range.start,
      dateEnd: endOfDay(range.end),
      price,
      isFree,
      organizer: ORGANIZER,
      tags: ["de boa brasilia"],
      sourceUrl: post.link,
      ageRating,
      soldOut: false,
    };
  } catch (error) {
    console.warn(
      `[deboa] Falha ao processar evento ${post?.id ?? "desconhecido"}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }
}
