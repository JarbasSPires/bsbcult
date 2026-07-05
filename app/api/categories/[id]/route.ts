import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-guard";
import { categorySchema } from "@/lib/validations";
import { updateCategory, deleteCategory } from "@/lib/services/categories";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const body = await request.json();
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const category = await updateCategory(params.id, parsed.data);
  return NextResponse.json(category);
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  await deleteCategory(params.id);
  return NextResponse.json({ success: true });
}
