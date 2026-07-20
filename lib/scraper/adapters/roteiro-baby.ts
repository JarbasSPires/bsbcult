import he from "he";
import type { EventSourceAdapter, NormalizedEvent } from "@/lib/scraper/types";
import { extractPtBrDateRange, endOfDay } from "@/lib/scraper/normalize";
import { inferCategory } from "@/lib/scraper/infer-category";

// Roteiro Baby publishes a weekly "Agenda infantil de Brasília" roundup post
// (WordPress) whose body lists several events using a consistent emoji-marker
// format: 🔹title, then free-text description/@handle lines, then one or more
// 📅<weekday abbrev> (+optional ⏰time) lines, a 📍location line, and a 💲price
// line. The emoji sometimes appears as a literal Unicode character and
// sometimes as an `<img alt="🔹">` (the site's content editor renders emoji as
// images in some posts) — both are normalized to the same flat line list
// before parsing, so one code path handles both shapes.
//
// Only these structured roundup posts are scraped (filtered by title); Roteiro
// Baby's other posts are free-form news prose without reliable per-event
// dates, so — per this project's convention — they're left unscraped rather
// than guessed at.
const API_URL = "https://roteirobaby.com.br/wp-json/wp/v2/posts?search=Roteiro+Baby+Agenda+infantil&per_page=10&_embed=wp:featuredmedia";
const FALLBACK_IMAGE = "https://roteirobaby.com.br/favicon.ico";
const DEFAULT_LOCATION = "Brasília - DF";

const WEEKDAY_TOKENS: Record<string, number> = {
  dom: 0,
  seg: 1,
  ter: 2,
  qua: 3,
  qui: 4,
  sex: 5,
  sab: 6,
};

interface WPPost {
  id: number;
  link: string;
  title: { rendered: string };
  content: { rendered: string };
  _embedded?: { "wp:featuredmedia"?: { source_url: string }[] };
}

export const roteiroBabyAdapter: EventSourceAdapter = {
  slug: "roteiro-baby",
  name: "Roteiro Baby",
  baseUrl: "https://roteirobaby.com.br",
  adapterType: "WORDPRESS",

  async fetchEvents(): Promise<NormalizedEvent[]> {
    const response = await fetch(API_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BsbCultBot/1.0)" },
    });
    if (!response.ok) {
      throw new Error(`Roteiro Baby API respondeu ${response.status}`);
    }
    return parseRoteiroBabyPosts(await response.json());
  },
};

// Normalizes an <img alt="EMOJI" ...> tag to the literal emoji text, then
// treats <br> and closing block tags as line breaks — this makes the two
// content shapes (one <p> with internal <br>, or one <p> per field)
// indistinguishable downstream.
function toLines(html: string): string[] {
  return he
    .decode(html)
    .replace(/<img[^>]*alt="([^"]*)"[^>]*>/gi, "$1")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean);
}

function stripAccents(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Finds the date within [start, start+6] whose weekday matches `token`
// ("dom"/"seg"/.../"sab"). A 7-day window always contains every weekday
// exactly once, so this tolerates the roundup title's stated range not
// perfectly lining up with the block's own day labels.
function resolveWeekday(token: string, rangeStart: Date): Date | null {
  const target = WEEKDAY_TOKENS[stripAccents(token)];
  if (target === undefined) return null;
  for (let i = 0; i < 7; i++) {
    const candidate = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate() + i);
    if (candidate.getDay() === target) return candidate;
  }
  return null;
}

function isEmojiHeader(line: string, emoji: string): boolean {
  return line.startsWith(emoji);
}

export function parseRoteiroBabyPosts(posts: WPPost[], now: Date = new Date()): NormalizedEvent[] {
  return posts.flatMap((post) => parsePost(post, now));
}

function parsePost(post: WPPost, now: Date): NormalizedEvent[] {
  const title = he.decode(post.title?.rendered ?? "");
  const haystack = stripAccents(title);
  if (!haystack.includes("roteiro baby") || !haystack.includes("agenda infantil")) return [];

  // rollover disabled: titles are always yearless here, and this source can
  // go stale between visits — a genuinely past date is correctly filtered out
  // downstream by the app's upcoming-events logic, rather than being rolled
  // a full year into a fabricated future date.
  const range = extractPtBrDateRange(title, now, { rollover: false });
  if (!range) return [];

  const lines = toLines(post.content?.rendered ?? "");
  const blocks: string[][] = [];
  for (const line of lines) {
    if (isEmojiHeader(line, "🔹")) blocks.push([line]);
    else if (blocks.length > 0) blocks.at(-1)!.push(line);
  }

  const imageUrl = post._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? FALLBACK_IMAGE;

  return blocks
    .map((block, index) => parseBlock(block, index, post, range.start, imageUrl))
    .filter((event): event is NormalizedEvent => event !== null);
}

function parseBlock(
  block: string[],
  index: number,
  post: WPPost,
  rangeStart: Date,
  imageUrl: string,
): NormalizedEvent | null {
  try {
    const eventTitle = block[0].replace(/^🔹/, "").trim();
    if (!eventTitle) return null;

    const descriptionLines: string[] = [];
    let organizer: string | null = null;
    let locationName: string | null = null;
    let priceText: string | null = null;
    const resolvedDates: Date[] = [];

    for (const line of block.slice(1)) {
      if (isEmojiHeader(line, "📅")) {
        const resolved = resolveWeekday(line.replace(/^📅/, "").trim(), rangeStart);
        if (resolved) resolvedDates.push(resolved);
      } else if (isEmojiHeader(line, "⏰")) {
        // time-of-day text isn't tracked as a separate structured field
        continue;
      } else if (isEmojiHeader(line, "📍")) {
        locationName ??= line.replace(/^📍/, "").trim();
      } else if (isEmojiHeader(line, "💲")) {
        priceText ??= line.replace(/^💲/, "").trim();
      } else if (line.startsWith("@")) {
        organizer ??= line;
      } else if (/^[a-zA-ZÀ-ÿ0-9]/.test(line)) {
        // starts with an actual (ASCII or accented Portuguese) letter/digit —
        // real description prose.
        descriptionLines.push(line);
      }
      // else: starts with some other symbol/emoji this parser doesn't track
      // (e.g. the 👧 age-range or 🎟 ticket-instructions lines) — ignored.
    }

    if (resolvedDates.length === 0) return null;
    const dateStart = resolvedDates.reduce((a, b) => (a < b ? a : b));
    const dateEnd = endOfDay(resolvedDates.reduce((a, b) => (a > b ? a : b)));

    const description = descriptionLines.join(" ").trim() || `${eventTitle}. Mais detalhes no link.`;
    const isFree = priceText ? /gratuit|basta chegar/i.test(priceText) : false;
    const priceMatch = priceText?.match(/R\$\s*([\d.]*\d,\d{2})/);
    const price = priceMatch ? Number(priceMatch[1].replace(/\./g, "").replace(",", ".")) : null;

    const inferred = inferCategory(eventTitle, description);
    const category = inferred === "OUTRO" ? "INFANTIL" : inferred;

    return {
      externalId: `${post.id}-${index}`,
      title: eventTitle,
      description,
      category,
      imageUrl,
      locationName: locationName || DEFAULT_LOCATION,
      locationAddress: locationName ? `${locationName}, Brasília - DF` : DEFAULT_LOCATION,
      dateStart,
      dateEnd,
      price,
      isFree,
      organizer: organizer ?? "Roteiro Baby",
      tags: ["roteiro baby"],
      sourceUrl: post.link,
      ageRating: null,
      soldOut: false,
    };
  } catch (error) {
    console.warn(
      `[roteiro-baby] Falha ao processar bloco ${index} do post ${post?.id ?? "desconhecido"}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }
}
