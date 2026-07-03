import { prisma } from "@/lib/prisma";

export async function listCategories() {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
}
