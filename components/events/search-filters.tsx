"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import type { Category } from "@prisma/client";

export function SearchFilters({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/busca?${params.toString()}`);
  }

  return (
    <div className="space-y-3">
      <Input
        placeholder="Buscar por nome, categoria ou local..."
        defaultValue={searchParams.get("q") ?? ""}
        onChange={(e) => updateParam("q", e.target.value)}
      />
      <div className="flex flex-wrap gap-3">
        <select
          className="h-10 rounded-xl border border-gray-300 bg-white px-3 text-sm"
          defaultValue={searchParams.get("category") ?? ""}
          onChange={(e) => updateParam("category", e.target.value)}
        >
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.value}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-xl border border-gray-300 bg-white px-3 text-sm"
          defaultValue={searchParams.get("isFree") ?? ""}
          onChange={(e) => updateParam("isFree", e.target.value)}
        >
          <option value="">Gratuito ou pago</option>
          <option value="true">Gratuito</option>
          <option value="false">Pago</option>
        </select>
      </div>
    </div>
  );
}
