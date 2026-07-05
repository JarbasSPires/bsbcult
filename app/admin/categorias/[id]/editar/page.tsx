import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CategoryForm } from "@/components/admin/category-form";

export default async function EditCategoryPage({ params }: { params: { id: string } }) {
  const category = await prisma.category.findUnique({ where: { id: params.id } });
  if (!category) notFound();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Editar Categoria</h2>
      <CategoryForm category={category} />
    </div>
  );
}
