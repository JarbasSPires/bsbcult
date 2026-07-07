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
