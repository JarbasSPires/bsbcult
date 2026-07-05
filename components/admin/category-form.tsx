"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CATEGORY_VALUES } from "@/lib/validations";
import type { Category } from "@prisma/client";

export function CategoryForm({ category }: { category?: Category }) {
  const router = useRouter();
  const [values, setValues] = useState({
    name: category?.name ?? "",
    value: category?.value ?? "SHOW",
    icon: category?.icon ?? "Sparkles",
    color: category?.color ?? "#6366f1",
    description: category?.description ?? "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch(category ? `/api/categories/${category.id}` : "/api/categories", {
      method: category ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    setLoading(false);
    if (!res.ok) {
      setError("Não foi possível salvar a categoria.");
      return;
    }
    router.push("/admin/categorias");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <Input placeholder="Nome" value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} required />
      <select
        className="h-11 w-full rounded-xl border border-gray-300 px-3 text-sm"
        value={values.value}
        onChange={(e) => setValues({ ...values, value: e.target.value as (typeof CATEGORY_VALUES)[number] })}
      >
        {CATEGORY_VALUES.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
      <Input placeholder="Ícone (nome lucide-react, ex: Music)" value={values.icon} onChange={(e) => setValues({ ...values, icon: e.target.value })} required />
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={values.color}
          onChange={(e) => setValues({ ...values, color: e.target.value })}
          className="h-11 w-14 rounded-xl border border-gray-300"
        />
        <Input placeholder="Cor (hex)" value={values.color} onChange={(e) => setValues({ ...values, color: e.target.value })} required />
      </div>
      <textarea
        placeholder="Descrição"
        className="h-24 w-full rounded-xl border border-gray-300 p-3 text-sm"
        value={values.description}
        onChange={(e) => setValues({ ...values, description: e.target.value })}
        required
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Salvando..." : category ? "Salvar alterações" : "Criar categoria"}
      </Button>
    </form>
  );
}
