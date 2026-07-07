import { prisma } from "@/lib/prisma";
import type { EventSource } from "@prisma/client";

export async function listEventSources(): Promise<EventSource[]> {
  return prisma.eventSource.findMany({ orderBy: { name: "asc" } });
}
