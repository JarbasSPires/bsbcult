import { prisma } from "@/lib/prisma";
import type { Event, EventCategory, EventStatus, Prisma } from "@prisma/client";

export interface EventFilters {
  q?: string;
  category?: EventCategory;
  isFree?: boolean;
  status?: EventStatus;
  dateFrom?: Date;
  dateTo?: Date;
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
    where: { featured: true, status: "ATIVO" },
    orderBy: { dateStart: "asc" },
    take: 10,
  });
}

export async function getEventById(id: string): Promise<Event | null> {
  return prisma.event.findUnique({ where: { id } });
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
