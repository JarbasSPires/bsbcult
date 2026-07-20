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

export interface DateRange {
  start: Date;
  end: Date;
}

const MONTH_NAMES = Object.keys(PT_MONTHS).join("|");
// Tried as one alternation per match position so a shared-month pair ("25 e 26
// de julho") is captured as two day tokens for a single month, while a
// different-months pair ("30 de julho a 2 de agosto") falls through to two
// independent single-day matches instead (the "dual" branch only fires when
// no "de <mês>" sits between the two day numbers).
// Day tokens are boundary-guarded ((?<!\d)/(?!\d)) so a 1-2 digit match can
// never be a substring of a longer run of digits — otherwise "26" inside the
// year "2026" would itself be misread as a day number.
const DAY_MONTH_RE = new RegExp(
  `(?:(?<!\\d)(?<d1>\\d{1,2})(?!\\d)\\s*(?:a|e)\\s*(?<!\\d)(?<d2>\\d{1,2})(?!\\d)\\s+de\\s+(?<m1>${MONTH_NAMES}))` +
    `|(?:(?<!\\d)(?<d3>\\d{1,2})(?!\\d)\\s+de\\s+(?<m2>${MONTH_NAMES}))`,
  "g",
);
const YEAR_RE = /de\s+(\d{4})/g;
// "1°"/"1º" ordinal day markers ("1° de agosto") normalize to a plain digit.
const ORDINAL_DAY_RE = /(\d+)[°º]\s*(de\b)/g;

// Extracts a date OR date range from free-form pt-BR prose — e.g. event
// listing fields like "Data: 30 de julho a 2 de agosto de 2026, quinta a
// domingo" or a roundup-post title like "agenda infantil ... para 10 a 12 de
// junho" (no year). Handles:
//   - a single date ("30 de julho de 2026")
//   - a range joined by "a" or "e" ("25 e 26 de julho de 2026")
//   - a range crossing a year boundary, each side keeping its own year
//     ("27 de Dezembro de 2026 a 03 de Janeiro de 2027")
//   - more than two day-month tokens (e.g. a recurring/split schedule) — start
//     is the earliest resolved date, end is the latest
//   - a missing year, inferred via the same 30-day-past rollover used
//     elsewhere in the scraper (parseDayMonthWithRollover)
// `rollover` (default true) controls what happens to a day-month token with
// no explicit year: true uses the standard 30-day-past-rolls-to-next-year
// heuristic (parseDayMonthWithRollover); false always resolves to `now`'s
// year. Disable it for sources where "now" may itself be stale (e.g. a
// roundup post the site hasn't refreshed in a while) — there, a genuinely
// past resulting date is correctly filtered out by the app's own
// upcoming-events logic, whereas a rollover would fabricate a future date a
// full year off.
export function extractPtBrDateRange(
  text: string,
  now: Date = new Date(),
  options: { rollover?: boolean } = {},
): DateRange | null {
  const normalized = stripAccents(text).replace(ORDINAL_DAY_RE, "$1 $2");

  const dayMonthTokens: { day: number; month: number; end: number }[] = [];
  DAY_MONTH_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = DAY_MONTH_RE.exec(normalized)) !== null) {
    const g = m.groups!;
    const end = m.index + m[0].length;
    if (g.d1 !== undefined) {
      const month = PT_MONTHS[g.m1];
      dayMonthTokens.push({ day: Number(g.d1), month, end }, { day: Number(g.d2), month, end });
    } else {
      dayMonthTokens.push({ day: Number(g.d3), month: PT_MONTHS[g.m2], end });
    }
  }
  if (dayMonthTokens.length === 0) return null;

  const yearTokens: { year: number; index: number }[] = [];
  YEAR_RE.lastIndex = 0;
  while ((m = YEAR_RE.exec(normalized)) !== null) {
    yearTokens.push({ year: Number(m[1]), index: m.index });
  }

  const dates = dayMonthTokens.map(({ day, month, end }) => {
    const year = yearTokens.find((y) => y.index >= end) ?? yearTokens.at(-1);
    if (year) return new Date(year.year, month - 1, day);
    return options.rollover === false
      ? new Date(now.getFullYear(), month - 1, day)
      : parseDayMonthWithRollover(day, month, now);
  });

  return {
    start: dates.reduce((a, b) => (a < b ? a : b)),
    end: dates.reduce((a, b) => (a > b ? a : b)),
  };
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
