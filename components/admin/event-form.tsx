"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { parseTags } from "@/lib/utils";
import type { Category, Event } from "@prisma/client";

interface FormValues {
  title: string;
  description: string;
  category: string;
  imageUrl: string;
  locationName: string;
  locationAddress: string;
  dateStart: string;
  dateEnd: string;
  price: string;
  isFree: boolean;
  organizer: string;
  tags: string;
  featured: boolean;
  status: string;
}

function toDatetimeLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toFormValues(event?: Event): FormValues {
  if (!event) {
    return {
      title: "", description: "", category: "SHOW", imageUrl: "", locationName: "",
      locationAddress: "", dateStart: "", dateEnd: "", price: "", isFree: false,
      organizer: "", tags: "", featured: false, status: "ATIVO",
    };
  }
  return {
    title: event.title,
    description: event.description,
    category: event.category,
    imageUrl: event.imageUrl,
    locationName: event.locationName,
    locationAddress: event.locationAddress,
    dateStart: toDatetimeLocal(new Date(event.dateStart)),
    dateEnd: toDatetimeLocal(new Date(event.dateEnd)),
    price: event.price?.toString() ?? "",
    isFree: event.isFree,
    organizer: event.organizer,
    tags: parseTags(event.tags).join(", "),
    featured: event.featured,
    status: event.status,
  };
}

export function EventForm({ event, categories }: { event?: Event; categories: Category[] }) {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(toFormValues(event));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const payload = {
      title: values.title,
      description: values.description,
      category: values.category,
      imageUrl: values.imageUrl,
      locationName: values.locationName,
      locationAddress: values.locationAddress,
      dateStart: new Date(values.dateStart).toISOString(),
      dateEnd: new Date(values.dateEnd).toISOString(),
      price: values.isFree || !values.price ? null : Number(values.price),
      isFree: values.isFree,
      organizer: values.organizer,
      tags: values.tags.split(",").map((t) => t.trim()).filter(Boolean),
      featured: values.featured,
      status: values.status,
    };

    const res = await fetch(event ? `/api/events/${event.id}` : "/api/events", {
      method: event ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);
    if (!res.ok) {
      setError("Não foi possível salvar o evento. Confira os campos obrigatórios.");
      return;
    }
    router.push("/admin/eventos");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
      <Input placeholder="Título" value={values.title} onChange={(e) => setValues({ ...values, title: e.target.value })} required />
      <textarea
        placeholder="Descrição"
        className="h-28 w-full rounded-xl border border-gray-300 p-3 text-sm"
        value={values.description}
        onChange={(e) => setValues({ ...values, description: e.target.value })}
        required
      />
      <div className="grid grid-cols-2 gap-4">
        <select
          className="h-11 rounded-xl border border-gray-300 px-3 text-sm"
          value={values.category}
          onChange={(e) => setValues({ ...values, category: e.target.value })}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.value}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="h-11 rounded-xl border border-gray-300 px-3 text-sm"
          value={values.status}
          onChange={(e) => setValues({ ...values, status: e.target.value })}
        >
          <option value="ATIVO">Ativo</option>
          <option value="EM_BREVE">Em breve</option>
          <option value="ENCERRADO">Encerrado</option>
        </select>
      </div>
      <Input placeholder="URL da imagem" value={values.imageUrl} onChange={(e) => setValues({ ...values, imageUrl: e.target.value })} required />
      <div className="grid grid-cols-2 gap-4">
        <Input placeholder="Nome do local" value={values.locationName} onChange={(e) => setValues({ ...values, locationName: e.target.value })} required />
        <Input placeholder="Endereço" value={values.locationAddress} onChange={(e) => setValues({ ...values, locationAddress: e.target.value })} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm text-gray-600">
          Início
          <input
            type="datetime-local"
            className="h-11 rounded-xl border border-gray-300 px-3 text-sm"
            value={values.dateStart}
            onChange={(e) => setValues({ ...values, dateStart: e.target.value })}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-600">
          Fim
          <input
            type="datetime-local"
            className="h-11 rounded-xl border border-gray-300 px-3 text-sm"
            value={values.dateEnd}
            onChange={(e) => setValues({ ...values, dateEnd: e.target.value })}
            required
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          placeholder="Preço (R$)"
          type="number"
          value={values.price}
          disabled={values.isFree}
          onChange={(e) => setValues({ ...values, price: e.target.value })}
        />
        <Input placeholder="Organizador" value={values.organizer} onChange={(e) => setValues({ ...values, organizer: e.target.value })} required />
      </div>
      <Input placeholder="Tags (separadas por vírgula)" value={values.tags} onChange={(e) => setValues({ ...values, tags: e.target.value })} />
      <div className="flex gap-6 text-sm text-gray-600">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={values.isFree} onChange={(e) => setValues({ ...values, isFree: e.target.checked })} />
          Gratuito
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={values.featured} onChange={(e) => setValues({ ...values, featured: e.target.checked })} />
          Destaque
        </label>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Salvando..." : event ? "Salvar alterações" : "Criar evento"}
      </Button>
    </form>
  );
}
