"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { Category } from "@prisma/client";

export function CategoriesTable({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [items, setItems] = useState(categories);

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta categoria?")) return;
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((c) => c.id !== id));
    router.refresh();
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-100 text-gray-500">
          <tr>
            <th className="p-3">Nome</th>
            <th className="p-3">Valor</th>
            <th className="p-3">Cor</th>
            <th className="p-3"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((category) => (
            <tr key={category.id} className="border-b border-gray-50">
              <td className="p-3 font-medium text-gray-900">{category.name}</td>
              <td className="p-3">{category.value}</td>
              <td className="p-3">
                <span className="inline-block h-4 w-4 rounded-full align-middle" style={{ backgroundColor: category.color }} />{" "}
                {category.color}
              </td>
              <td className="flex gap-2 p-3">
                <Link href={`/admin/categorias/${category.id}/editar`}>
                  <Button variant="outline" size="sm">
                    Editar
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(category.id)}>
                  Excluir
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
