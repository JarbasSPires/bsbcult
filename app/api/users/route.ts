import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-guard";
import { listUsers } from "@/lib/services/users";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const users = await listUsers();
  return NextResponse.json(users);
}
