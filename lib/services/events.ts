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
