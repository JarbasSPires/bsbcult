import * as cheerio from "cheerio";
import type { EventSourceAdapter, NormalizedEvent } from "@/lib/scraper/types";
import { parseSlashDate, endOfDay, slugFromUrl } from "@/lib/scraper/normalize";
import { inferCategory } from "@/lib/scraper/infer-category";

const AGENDA_URL = "https://arenabsb.com.br/agenda/";
const FALLBACK_IMAGE = "https://arenabsb.com.br/wp-content/uploads/2023/05/logo-header-arena-brb.svg";
const FALLBACK_DESCRIPTION = "Evento na Arena BRB. Mais detalhes no link oficial.";
const DEFAULT_LOCATION = "Arena BRB Mané Garrincha";
const DEFAULT_ADDRESS = "SRPN, Asa Norte, Brasília - DF";

export const arenaBrbAdapter: EventSourceAdapter = {
  slug: "arena-brb",
  name: "Arena BRB",
  baseUrl: "https://arenabsb.com.br",
  adapterType: "HTML",

  async fetchEvents(): Promise<NormalizedEvent[]> {
    const response = await fetch(AGENDA_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BsbCultBot/1.0)" },
    });
    if (!response.ok) {
      throw new Error(`Arena BRB respondeu ${response.status}`);
    }
    return parseAgendaHtml(await response.text());
  },
};

export function parseAgendaHtml(html: string): NormalizedEvent[] {
  const $ = cheerio.load(html);
  const events: NormalizedEvent[] = [];

  $(".agenda-repeater-item").each((_, element) => {
    const $item = $(element);
    const title = $item.find(".agenda-repeater-item-content-link-title").text().trim();
    const detailUrl = $item.find("a.agenda-repeater-item-content-link").attr("href");
    const dateText = $item.find(".agenda-repeater-item-infos-data span").text().trim();
    const locationName = $item.find(".agenda-repeater-item-infos-local span").text().trim();
    const description = $item.find(".agenda-repeater-item-content-link-text").text().trim();
    const imageUrl = $item.find("img").attr("src");

    if (!title || !detailUrl || !dateText) return;

    try {
      const dateStart = parseSlashDate(dateText);

      events.push({
        externalId: slugFromUrl(detailUrl),
        title,
        description: description || FALLBACK_DESCRIPTION,
        category: inferCategory(title, description),
        imageUrl: imageUrl ?? FALLBACK_IMAGE,
        locationName: locationName || DEFAULT_LOCATION,
        locationAddress: DEFAULT_ADDRESS,
        dateStart,
        dateEnd: endOfDay(dateStart),
        price: null,
        isFree: false,
        organizer: "Arena BRB",
        tags: ["arena brb"],
        sourceUrl: detailUrl,
        ageRating: null,
        soldOut: false,
      });
    } catch (error) {
      console.warn(
        `[arena-brb] Falha ao processar item "${title}" (${detailUrl}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  });

  return events;
}
