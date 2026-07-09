import he from "he";
import type { EventSourceAdapter, NormalizedEvent } from "@/lib/scraper/types";
import { parseDayMonthWithRollover, endOfDay } from "@/lib/scraper/normalize";
import { inferCategory } from "@/lib/scraper/infer-category";

const CATEGORY_ID = 27;
const API_URL = `https://clubedochoro.com.br/wp-json/wp/v2/posts?categories=${CATEGORY_ID}&per_page=50&_embed=wp:featuredmedia`;
const FALLBACK_IMAGE = "https://clubedochoro.com.br/wp-content/uploads/2023/01/logo-clube-do-choro.png";
const FALLBACK_DESCRIPTION = "Evento no Clube do Choro. Mais detalhes no link oficial.";
const TITLE_PATTERN = /^(\d{2})\/(\d{2})\s*[–-]\s*([\s\S]+)$/;

interface WordPressPost {
  id: number;
  link: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  _embedded?: { "wp:featuredmedia"?: { source_url: string }[] };
}

export const clubeDoChoroAdapter: EventSourceAdapter = {
  slug: "clube-do-choro",
  name: "Clube do Choro",
  baseUrl: "https://clubedochoro.com.br",
  adapterType: "WORDPRESS",

  async fetchEvents(): Promise<NormalizedEvent[]> {
    const response = await fetch(API_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BsbCultBot/1.0)" },
    });
    if (!response.ok) {
      throw new Error(`Clube do Choro API respondeu ${response.status}`);
    }
    return parseWordPressPosts(await response.json());
  },
};

export function parseWordPressPosts(posts: WordPressPost[]): NormalizedEvent[] {
  return posts
    .map(parsePost)
    .filter((event): event is NormalizedEvent => event !== null);
}

function parsePost(post: WordPressPost): NormalizedEvent | null {
  try {
    const decodedTitle = he.decode(post.title?.rendered ?? "");
    const match = decodedTitle.match(TITLE_PATTERN);
    if (!match) return null;

    const [, dayText, monthText, eventTitle] = match;
    const dateStart = parseDayMonthWithRollover(Number(dayText), Number(monthText));
    const decodedExcerpt = he
      .decode(post.excerpt?.rendered ?? "")
      .replace(/<[^>]+>/g, "")
      .trim();

    // Venue default is SHOW when keyword inference is inconclusive (music venue).
    const inferred = inferCategory(eventTitle, decodedExcerpt);
    const category = inferred === "OUTRO" ? "SHOW" : inferred;

    return {
      externalId: String(post.id),
      title: eventTitle.trim(),
      description: decodedExcerpt || FALLBACK_DESCRIPTION,
      category,
      imageUrl: post._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? FALLBACK_IMAGE,
      locationName: "Clube do Choro",
      locationAddress: "SCES Trecho 2, Conjunto 39 - Asa Sul, Brasília - DF",
      dateStart,
      dateEnd: endOfDay(dateStart),
      price: null,
      isFree: false,
      organizer: "Clube do Choro",
      tags: ["choro", "música ao vivo"],
      sourceUrl: post.link,
      ageRating: null,
      soldOut: false,
    };
  } catch (error) {
    console.warn(
      `[clube-do-choro] Falha ao processar post ${post?.id ?? "desconhecido"}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }
}
