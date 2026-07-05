import { NextRequest, NextResponse } from "next/server";
import { listEvents, createEvent } from "@/lib/services/events";
import type { EventCategory, EventStatus } from "@prisma/client";
import { requireAdminSession } from "@/lib/admin-guard";
import { eventSchema } from "@/lib/validations";

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

export async function POST(request: NextRequest) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const body = await request.json();
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const event = await createEvent({
    ...parsed.data,
    dateStart: new Date(parsed.data.dateStart),
    dateEnd: new Date(parsed.data.dateEnd),
  });
  return NextResponse.json(event, { status: 201 });
}
