import type { EventSourceAdapter, NormalizedEvent } from "@/lib/scraper/types";
import { endOfDay } from "@/lib/scraper/normalize";
import { inferCategory } from "@/lib/scraper/infer-category";

// SESI Lab renders its agenda client-side from a Liferay Objects REST endpoint
// (scope 345927 is the sesi-lab site). The listing page /programacao only ships
// the JS template; the real data lives here.
const SCOPE_ID = 345927;
const API_URL = `https://www.sesilab.com.br/o/c/slevents/scopes/${SCOPE_ID}?nestedFields=eventSession&pageSize=-1`;
const LISTING_URL = "https://www.sesilab.com.br/programacao";
const FALLBACK_IMAGE = "https://www.sesilab.com.br/o/sesi-lab-theme/images/logo.png";
const DEFAULT_LOCATION = "SESI Lab";
const DEFAULT_ADDRESS = "SBN Quadra 1, Bloco J, Asa Norte, Brasília - DF";

interface SesiCategoria {
  key?: string;
  name?: string;
}

interface SesiEvent {
  id: number;
  titulo?: string;
  subtitulo?: string;
  categoria?: SesiCategoria;
  dataDeInicio?: string;
  dataFinal?: string;
  horarioInicial?: string;
  horarioFinal?: string;
  local?: string;
  classificacaoEtaria?: SesiCategoria;
  descricaoRawText?: string;
}

interface SesiResponse {
  items?: SesiEvent[];
}

export const sesiLabAdapter: EventSourceAdapter = {
  slug: "sesi-lab",
  name: "SESI Lab",
  baseUrl: "https://www.sesilab.com.br",
  adapterType: "HTML",

  async fetchEvents(): Promise<NormalizedEvent[]> {
    const response = await fetch(API_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BsbCultBot/1.0)",
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`SESI Lab API respondeu ${response.status}`);
    }
    const data = (await response.json()) as SesiResponse;
    return parseSesiEvents(data.items ?? []);
  },
};

// Extracts the calendar date (Y-M-D) from a "2026-07-05T00:00:00.000Z" string,
// building a local Date so the day never shifts across the timezone boundary.
function isoToLocalDate(iso: string | undefined): Date | null {
  const match = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function stripHtml(text: string | undefined): string {
  return (text ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function parseSesiEvents(items: SesiEvent[], now: Date = new Date()): NormalizedEvent[] {
  return items
    .map((item) => parseEvent(item, now))
    .filter((event): event is NormalizedEvent => event !== null);
}

function parseEvent(item: SesiEvent, now: Date): NormalizedEvent | null {
  try {
    const title = (item.titulo ?? "").trim();
    if (!title) return null;

    const dateStart = isoToLocalDate(item.dataDeInicio);
    if (!dateStart) return null;

    const dateEnd = isoToLocalDate(item.dataFinal) ?? dateStart;
    const dateEndInclusive = endOfDay(dateEnd);
    // Drop events whose run has already ended — the API returns years of history.
    if (dateEndInclusive < now) return null;

    const description = (item.descricaoRawText ?? item.subtitulo ?? "").trim();
    const location = stripHtml(item.local) || DEFAULT_LOCATION;
    const ageRating = item.classificacaoEtaria?.name?.trim() || null;
    const isFree = /gratuit|gr[aá]tis/i.test(`${title} ${description}`);

    return {
      externalId: String(item.id),
      title,
      description: description || "Programação do SESI Lab. Mais detalhes no site.",
      category: inferCategory(title, description),
      imageUrl: FALLBACK_IMAGE,
      locationName: location,
      locationAddress: DEFAULT_ADDRESS,
      dateStart,
      dateEnd: dateEndInclusive,
      price: null,
      isFree,
      organizer: "SESI Lab",
      tags: ["sesi lab"],
      sourceUrl: LISTING_URL,
      ageRating,
      soldOut: false,
    };
  } catch (error) {
    console.warn(
      `[sesi-lab] Falha ao processar evento ${item?.id ?? "desconhecido"}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }
}
