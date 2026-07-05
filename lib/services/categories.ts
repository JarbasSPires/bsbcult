import { prisma } from "@/lib/prisma";
import type { CategoryInput } from "@/lib/validations";

export async function listCategories() {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
}

export async function createCategory(data: CategoryInput) {
  return prisma.category.create({ data });
}

export async function updateCategory(id: string, data: CategoryInput) {
  return prisma.category.update({ where: { id }, data });
}

export async function deleteCategory(id: string) {
  await prisma.category.delete({ where: { id } });
}
