import { NextRequest, NextResponse } from "next/server";
import { listCategories, createCategory } from "@/lib/services/categories";
import { requireAdminSession } from "@/lib/admin-guard";
import { categorySchema } from "@/lib/validations";

export async function GET() {
  const categories = await listCategories();
  return NextResponse.json(categories);
}

export async function POST(request: NextRequest) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const body = await request.json();
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const category = await createCategory(parsed.data);
  return NextResponse.json(category, { status: 201 });
}
