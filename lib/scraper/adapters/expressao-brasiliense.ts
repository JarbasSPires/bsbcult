import he from "he";
import type { EventSourceAdapter, NormalizedEvent } from "@/lib/scraper/types";
import { parsePtBrDate, endOfDay } from "@/lib/scraper/normalize";
import { inferCategory } from "@/lib/scraper/infer-category";

const CATEGORY_ID = 4; // "Cultura"
const API_URL = `https://expressaobrasiliense.com/wp-json/wp/v2/posts?categories=${CATEGORY_ID}&per_page=50&_embed=wp:featuredmedia`;
const FALLBACK_IMAGE = "https://expressaobrasiliense.com/wp-content/uploads/logo-expressao.png";
const FALLBACK_DESCRIPTION = "Evento divulgado pelo Expressão Brasiliense. Mais detalhes no link.";
const FALLBACK_LOCATION = "Brasília - DF";

interface WordPressPost {
  id: number;
  link: string;
  title: { rendered: string | null };
  excerpt: { rendered: string | null };
  _embedded?: { "wp:featuredmedia"?: { source_url: string }[] };
}

export const expressaoBrasilienseAdapter: EventSourceAdapter = {
  slug: "expressao-brasiliense",
  name: "Expressão Brasiliense",
  baseUrl: "https://expressaobrasiliense.com",
  adapterType: "WORDPRESS",

  async fetchEvents(): Promise<NormalizedEvent[]> {
    const response = await fetch(API_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BsbCultBot/1.0)" },
    });
    if (!response.ok) {
      throw new Error(`Expressão Brasiliense API respondeu ${response.status}`);
    }
    return parseExpressaoPosts(await response.json());
  },
};

export function parseExpressaoPosts(posts: WordPressPost[], now: Date = new Date()): NormalizedEvent[] {
  return posts
    .map((post) => parsePost(post, now))
    .filter((event): event is NormalizedEvent => event !== null);
}

function parsePost(post: WordPressPost, now: Date): NormalizedEvent | null {
  try {
    const title = he.decode(post.title?.rendered ?? "").trim();
    // A valid event needs a title — this is a news feed, some rows are empty.
    if (!title) return null;

    const excerpt = he
      .decode(post.excerpt?.rendered ?? "")
      .replace(/<[^>]+>/g, "")
      .trim();

    // News site: keep only posts that actually name a date, in the title first,
    // then the excerpt. Everything else is undated news and is dropped.
    const dateStart = parsePtBrDate(title, now) ?? parsePtBrDate(excerpt, now);
    if (!dateStart) return null;

    const isFree = /gratuit|gr[aá]tis/i.test(`${title} ${excerpt}`);

    return {
      externalId: String(post.id),
      title,
      description: excerpt || FALLBACK_DESCRIPTION,
      category: inferCategory(title, excerpt),
      imageUrl: post._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? FALLBACK_IMAGE,
      locationName: FALLBACK_LOCATION,
      locationAddress: FALLBACK_LOCATION,
      dateStart,
      dateEnd: endOfDay(dateStart),
      price: null,
      isFree,
      organizer: "Divulgação: Expressão Brasiliense",
      tags: ["expressão brasiliense"],
      sourceUrl: post.link,
      ageRating: null,
      soldOut: false,
    };
  } catch (error) {
    console.warn(
      `[expressao-brasiliense] Falha ao processar post ${post?.id ?? "desconhecido"}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }
}
