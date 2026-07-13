import { prisma } from "@/lib/prisma";
import type { Event, EventCategory, EventStatus, Prisma } from "@prisma/client";

export interface EventFilters {
  q?: string;
  category?: EventCategory;
  isFree?: boolean;
  status?: EventStatus;
  dateFrom?: Date;
  dateTo?: Date;
  sourceId?: string;
  /** When true, only events that have not ended yet (dateEnd >= now) are returned. */
  upcoming?: boolean;
}

export async function listEvents(filters: EventFilters = {}): Promise<Event[]> {
  const where: Prisma.EventWhereInput = {};

  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q } },
      { description: { contains: filters.q } },
      { locationName: { contains: filters.q } },
    ];
  }
  if (filters.category) where.category = filters.category;
  if (filters.isFree !== undefined) where.isFree = filters.isFree;
  if (filters.status) where.status = filters.status;
  if (filters.upcoming) where.dateEnd = { gte: new Date() };
  if (filters.sourceId === "MANUAL") where.sourceId = null;
  else if (filters.sourceId) where.sourceId = filters.sourceId;
  if (filters.dateFrom || filters.dateTo) {
    where.dateStart = {
      ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
      ...(filters.dateTo ? { lte: filters.dateTo } : {}),
    };
  }

  return prisma.event.findMany({ where, orderBy: { dateStart: "asc" } });
}

export async function getFeaturedEvents(): Promise<Event[]> {
  return prisma.event.findMany({
    where: { featured: true, status: "ATIVO", dateEnd: { gte: new Date() } },
    orderBy: { dateStart: "asc" },
    take: 10,
  });
}

// Upcoming events whose source is one of `sourceSlugs` — used for the home
// "Destaques" (Infinu/Shotgun + Sympla). Returns every such event from now
// through the end of the current year (no cap), for the side-scrolling row.
export async function getUpcomingHighlights(sourceSlugs: string[]): Promise<Event[]> {
  const now = new Date();
  const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  return prisma.event.findMany({
    where: {
      status: "ATIVO",
      dateEnd: { gte: now },
      dateStart: { lte: endOfYear },
      source: { slug: { in: sourceSlugs } },
    },
    orderBy: { dateStart: "asc" },
  });
}

// Upcoming events that are NOT from `sourceSlugs` (including manually-created
// events, which have no source) — the home groups these by category.
export async function getUpcomingEventsExcludingSources(sourceSlugs: string[]): Promise<Event[]> {
  return prisma.event.findMany({
    where: {
      status: "ATIVO",
      dateEnd: { gte: new Date() },
      NOT: { source: { slug: { in: sourceSlugs } } },
    },
    orderBy: { dateStart: "asc" },
  });
}

export async function getEventById(id: string): Promise<Event | null> {
  return prisma.event.findUnique({ where: { id } });
}

export async function getEventWithSource(id: string) {
  return prisma.event.findUnique({ where: { id }, include: { source: true } });
}

export async function getRelatedEvents(event: {
  id: string;
  category: EventCategory;
}): Promise<Event[]> {
  return prisma.event.findMany({
    where: {
      category: event.category,
      id: { not: event.id },
      status: "ATIVO",
      dateEnd: { gte: new Date() },
    },
    take: 4,
    orderBy: { dateStart: "asc" },
  });
}

// Named `EventCreateInput` rather than `EventInput` to avoid colliding with the
// Zod-inferred `EventInput` type exported from `lib/validations.ts` (which represents
// the raw request-body shape with string dates). This service-layer type represents
// the shape needed by Prisma, with `dateStart`/`dateEnd` as `Date` objects. Any file
// that needs both (e.g. the API routes) can import each under its own distinct name.
export interface EventCreateInput {
  title: string;
  description: string;
  category: EventCategory;
  imageUrl: string;
  locationName: string;
  locationAddress: string;
  dateStart: Date;
  dateEnd: Date;
  price: number | null;
  isFree: boolean;
  organizer: string;
  tags: string[];
  featured: boolean;
  status: EventStatus;
}

export async function createEvent(data: EventCreateInput): Promise<Event> {
  return prisma.event.create({ data: { ...data, tags: JSON.stringify(data.tags) } });
}

export async function updateEvent(id: string, data: EventCreateInput): Promise<Event> {
  return prisma.event.update({ where: { id }, data: { ...data, tags: JSON.stringify(data.tags) } });
}

export async function deleteEvent(id: string): Promise<void> {
  await prisma.event.delete({ where: { id } });
}
