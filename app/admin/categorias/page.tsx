import Link from "next/link";
import { listCategories } from "@/lib/services/categories";
import { CategoriesTable } from "@/components/admin/categories-table";
import { Button } from "@/components/ui/button";

export default async function AdminCategoriesPage() {
  const categories = await listCategories();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Categorias</h2>
        <Link href="/admin/categorias/nova">
          <Button>Nova Categoria</Button>
        </Link>
      </div>
      <CategoriesTable categories={categories} />
    </div>
  );
}
