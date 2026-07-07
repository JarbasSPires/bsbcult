import type { Event } from "@prisma/client";

function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

type DedupCandidate = Pick<Event, "id" | "title" | "locationName" | "dateStart">;

export function findCrossSourceDuplicate(
  candidate: { title: string; locationName: string; dateStart: Date },
  existing: DedupCandidate[]
): DedupCandidate | null {
  const candidateTitle = normalizeForComparison(candidate.title);
  const candidateLocation = normalizeForComparison(candidate.locationName);

  return (
    existing.find(
      (event) =>
        normalizeForComparison(event.title) === candidateTitle &&
        normalizeForComparison(event.locationName) === candidateLocation &&
        isSameDay(event.dateStart, candidate.dateStart)
    ) ?? null
  );
}
