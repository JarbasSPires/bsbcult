import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-guard";
import { eventSchema } from "@/lib/validations";
import { getEventById, updateEvent, deleteEvent } from "@/lib/services/events";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const event = await getEventById(params.id);
  if (!event) return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
  return NextResponse.json(event);
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const body = await request.json();
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const event = await updateEvent(params.id, {
    ...parsed.data,
    dateStart: new Date(parsed.data.dateStart),
    dateEnd: new Date(parsed.data.dateEnd),
  });
  return NextResponse.json(event);
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  await deleteEvent(params.id);
  return NextResponse.json({ success: true });
}
