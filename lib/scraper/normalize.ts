export function parseSlashDate(text: string): Date {
  const match = text.trim().match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (!match) throw new Error(`Data em formato inesperado: "${text}"`);
  const [, day, month, yy] = match;
  return new Date(2000 + Number(yy), Number(month) - 1, Number(day));
}

export function parseDayMonthWithRollover(day: number, month: number, now: Date = new Date()): Date {
  const candidate = new Date(now.getFullYear(), month - 1, day);
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 30);
  return candidate < cutoff ? new Date(now.getFullYear() + 1, month - 1, day) : candidate;
}

const PT_MONTHS: Record<string, number> = {
  janeiro: 1,
  fevereiro: 2,
  marco: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
};

const PT_MONTH_DATE = new RegExp(
  `(\\d{1,2})\\s+de\\s+(${Object.keys(PT_MONTHS).join("|")})`,
);
// A full DD/MM/YY(YY) is a strong date signal — accepted anywhere.
const SLASH_DATE_WITH_YEAR = /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/;
// A bare DD/MM is only trusted after a date cue (dia / em / às), so scores,
// ratios and registration ranges like "de 10/05 a 20/06" are not misread as
// the event date. (Accent-stripped haystack, so "às" appears as "as".)
const SLASH_DATE_WITH_CUE = /\b(?:dia|em|as)\s+(\d{1,2})\/(\d{1,2})\b/;

function stripAccents(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Extracts the first "DD de <mês>" or "DD/MM[/YY]" date from free-form pt-BR
// text and returns it as a Date. "DD de <mês>" and bare "DD/MM" use next-year
// rollover for long-past dates (via parseDayMonthWithRollover); an explicit
// "DD/MM/YY(YY)" year is honored as-is. Returns null when no date is present
// (e.g. an undated news post), so callers can skip such items.
export function parsePtBrDate(text: string, now: Date = new Date()): Date | null {
  const haystack = stripAccents(text);

  const monthMatch = haystack.match(PT_MONTH_DATE);
  if (monthMatch) {
    const day = Number(monthMatch[1]);
    const month = PT_MONTHS[monthMatch[2]];
    if (day >= 1 && day <= 31) return parseDayMonthWithRollover(day, month, now);
  }

  const yearMatch = haystack.match(SLASH_DATE_WITH_YEAR);
  if (yearMatch) {
    const day = Number(yearMatch[1]);
    const month = Number(yearMatch[2]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const yy = Number(yearMatch[3]);
      return new Date(yy < 100 ? 2000 + yy : yy, month - 1, day);
    }
  }

  const cueMatch = haystack.match(SLASH_DATE_WITH_CUE);
  if (cueMatch) {
    const day = Number(cueMatch[1]);
    const month = Number(cueMatch[2]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return parseDayMonthWithRollover(day, month, now);
    }
  }

  return null;
}

// Brazil has had no DST since 2019, so America/Sao_Paulo is a fixed UTC-3.
const SAO_PAULO_OFFSET_MS = 3 * 60 * 60 * 1000;

// Reads the Brasília calendar day (as a local-midnight Date) from a UTC ISO
// instant, so the day never shifts regardless of the timezone the scraper runs
// in. Returns null when the value is missing or unparseable.
export function isoToSaoPauloDate(iso: string | undefined | null): Date | null {
  const t = iso ? Date.parse(iso) : NaN;
  if (Number.isNaN(t)) return null;
  const local = new Date(t - SAO_PAULO_OFFSET_MS);
  return new Date(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
}

export function endOfDay(date: Date): Date {
  const end = new Date(date);
  end.setHours(23, 59, 0, 0);
  return end;
}

export function slugFromUrl(url: string): string {
  const segments = new URL(url).pathname.split("/").filter(Boolean);
  const lastSegment = segments.at(-1);
  if (!lastSegment) throw new Error(`Não foi possível extrair slug da URL: "${url}"`);
  return lastSegment;
}
