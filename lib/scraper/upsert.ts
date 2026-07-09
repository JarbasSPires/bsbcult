import { prisma } from "@/lib/prisma";
import type { EventSourceAdapter, NormalizedEvent } from "@/lib/scraper/types";
import { findCrossSourceDuplicate } from "@/lib/scraper/dedupe";

export interface RunResult {
  slug: string;
  ok: boolean;
  count: number;
  error?: string;
}

/**
 * Registers (or fetches) the EventSource row for this adapter, keyed by `slug`
 * (the true identity key). `name` also carries a DB-level unique constraint for
 * display purposes, but two distinct sources are not required to have distinct
 * display names — so a `name` collision with a *different* slug must not stop
 * this source from registering; we just skip updating `name` in that case.
 */
async function registerSource(adapter: EventSourceAdapter) {
  const existing = await prisma.eventSource.findUnique({ where: { slug: adapter.slug } });
  if (existing) {
    return prisma.eventSource.update({
      where: { id: existing.id },
      data: { baseUrl: adapter.baseUrl, ...(await isNameAvailable(adapter.name, existing.id) ? { name: adapter.name } : {}) },
    });
  }

  try {
    return await prisma.eventSource.create({
      data: {
        slug: adapter.slug,
        name: adapter.name,
        baseUrl: adapter.baseUrl,
        adapterType: adapter.adapterType,
      },
    });
  } catch {
    // `name` collided with a different source's row (unique constraint) — fall
    // back to a disambiguated name so this source can still register.
    return prisma.eventSource.create({
      data: {
        slug: adapter.slug,
        name: `${adapter.name} (${adapter.slug})`,
        baseUrl: adapter.baseUrl,
        adapterType: adapter.adapterType,
      },
    });
  }
}

async function isNameAvailable(name: string, excludingId: string): Promise<boolean> {
  const conflict = await prisma.eventSource.findUnique({ where: { name } });
  return !conflict || conflict.id === excludingId;
}

export async function runAdapter(adapter: EventSourceAdapter): Promise<RunResult> {
  const runStartedAt = new Date();
  const source = await registerSource(adapter);

  try {
    const normalizedEvents = await adapter.fetchEvents();

    for (const normalized of normalizedEvents) {
      await upsertNormalizedEvent(source.id, normalized);
    }

    await prisma.event.updateMany({
      where: {
        sourceId: source.id,
        lastSeenAt: { lt: runStartedAt },
        dateEnd: { gt: runStartedAt },
        status: { not: "ENCERRADO" },
      },
      data: { status: "ENCERRADO" },
    });

    await prisma.eventSource.update({
      where: { id: source.id },
      data: { lastRunAt: runStartedAt, lastRunStatus: "OK", lastRunError: null },
    });

    return { slug: adapter.slug, ok: true, count: normalizedEvents.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.eventSource.update({
      where: { id: source.id },
      data: { lastRunAt: runStartedAt, lastRunStatus: "ERROR", lastRunError: message },
    });
    return { slug: adapter.slug, ok: false, count: 0, error: message };
  }
}

async function upsertNormalizedEvent(sourceId: string, normalized: NormalizedEvent): Promise<void> {
  const existingBySourceKey = await prisma.event.findUnique({
    where: { sourceId_externalId: { sourceId, externalId: normalized.externalId } },
  });

  if (existingBySourceKey) {
    await applyUpdate(existingBySourceKey, normalized);
    return;
  }

  const dayStart = new Date(
    normalized.dateStart.getFullYear(),
    normalized.dateStart.getMonth(),
    normalized.dateStart.getDate()
  );
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const sameDayEvents = await prisma.event.findMany({
    where: { dateStart: { gte: dayStart, lt: dayEnd } },
  });
  const duplicate = findCrossSourceDuplicate(normalized, sameDayEvents);
  if (duplicate) {
    // `sameDayEvents` are full Event rows already in memory — reuse the matched
    // one to backfill instead of issuing another query.
    const existing = sameDayEvents.find((event) => event.id === duplicate.id);
    await prisma.event.update({
      where: { id: duplicate.id },
      data: {
        lastSeenAt: new Date(),
        price: existing?.price ?? normalized.price,
        ageRating: existing?.ageRating ?? normalized.ageRating,
      },
    });
    return;
  }

  await prisma.event.create({
    data: {
      title: normalized.title,
      description: normalized.description,
      category: normalized.category,
      imageUrl: normalized.imageUrl,
      locationName: normalized.locationName,
      locationAddress: normalized.locationAddress,
      dateStart: normalized.dateStart,
      dateEnd: normalized.dateEnd,
      price: normalized.price,
      isFree: normalized.isFree,
      organizer: normalized.organizer,
      tags: JSON.stringify(normalized.tags),
      ageRating: normalized.ageRating,
      soldOut: normalized.soldOut,
      status: "ATIVO",
      sourceId,
      sourceUrl: normalized.sourceUrl,
      externalId: normalized.externalId,
      lastSeenAt: new Date(),
    },
  });
}

async function applyUpdate(
  existing: {
    id: string;
    dateStart: Date;
    dateEnd: Date;
    price: number | null;
    locationName: string;
    status: string;
    ageRating: string | null;
    soldOut: boolean;
  },
  normalized: NormalizedEvent
): Promise<void> {
  const changes: { field: string; oldValue: string | null; newValue: string | null }[] = [];

  if (existing.dateStart.getTime() !== normalized.dateStart.getTime()) {
    changes.push({
      field: "dateStart",
      oldValue: existing.dateStart.toISOString(),
      newValue: normalized.dateStart.toISOString(),
    });
  }
  if (existing.dateEnd.getTime() !== normalized.dateEnd.getTime()) {
    changes.push({
      field: "dateEnd",
      oldValue: existing.dateEnd.toISOString(),
      newValue: normalized.dateEnd.toISOString(),
    });
  }
  if (existing.price !== normalized.price) {
    changes.push({
      field: "price",
      oldValue: existing.price?.toString() ?? null,
      newValue: normalized.price?.toString() ?? null,
    });
  }
  if (existing.locationName !== normalized.locationName) {
    changes.push({ field: "locationName", oldValue: existing.locationName, newValue: normalized.locationName });
  }
  if (existing.status !== "ATIVO") {
    changes.push({ field: "status", oldValue: existing.status, newValue: "ATIVO" });
  }
  if (existing.ageRating !== normalized.ageRating) {
    changes.push({ field: "ageRating", oldValue: existing.ageRating, newValue: normalized.ageRating });
  }
  if (existing.soldOut !== normalized.soldOut) {
    changes.push({
      field: "soldOut",
      oldValue: String(existing.soldOut),
      newValue: String(normalized.soldOut),
    });
  }

  await prisma.event.update({
    where: { id: existing.id },
    data: {
      title: normalized.title,
      description: normalized.description,
      dateStart: normalized.dateStart,
      dateEnd: normalized.dateEnd,
      price: normalized.price,
      isFree: normalized.isFree,
      locationName: normalized.locationName,
      locationAddress: normalized.locationAddress,
      imageUrl: normalized.imageUrl,
      ageRating: normalized.ageRating,
      soldOut: normalized.soldOut,
      status: "ATIVO",
      lastSeenAt: new Date(),
    },
  });

  if (changes.length > 0) {
    await prisma.eventChangeLog.createMany({
      data: changes.map((c) => ({ eventId: existing.id, field: c.field, oldValue: c.oldValue, newValue: c.newValue })),
    });
  }
}
