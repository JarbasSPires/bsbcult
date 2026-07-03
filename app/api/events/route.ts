import { NextRequest, NextResponse } from "next/server";
import { listEvents } from "@/lib/services/events";
import type { EventCategory, EventStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const q = params.get("q") ?? undefined;
  const category = (params.get("category") as EventCategory | null) ?? undefined;
  const status = (params.get("status") as EventStatus | null) ?? undefined;
  const isFreeParam = params.get("isFree");
  const dateFromParam = params.get("dateFrom");
  const dateToParam = params.get("dateTo");

  const events = await listEvents({
    q,
    category: category ?? undefined,
    status: status ?? undefined,
    isFree: isFreeParam === null ? undefined : isFreeParam === "true",
    dateFrom: dateFromParam ? new Date(dateFromParam) : undefined,
    dateTo: dateToParam ? new Date(dateToParam) : undefined,
  });

  return NextResponse.json(events);
}
