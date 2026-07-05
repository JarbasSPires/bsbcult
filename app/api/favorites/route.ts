import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listFavoritesForUser, addFavorite } from "@/lib/services/favorites";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const events = await listFavoritesForUser(session.user.id);
  return NextResponse.json(events);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { eventId } = await request.json();
  if (!eventId) return NextResponse.json({ error: "eventId é obrigatório" }, { status: 400 });

  await addFavorite(session.user.id, eventId);
  return NextResponse.json({ success: true }, { status: 201 });
}
