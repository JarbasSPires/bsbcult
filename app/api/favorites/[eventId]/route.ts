import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { removeFavorite } from "@/lib/services/favorites";

export async function DELETE(_request: Request, { params }: { params: { eventId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  await removeFavorite(session.user.id, params.eventId);
  return NextResponse.json({ success: true });
}
