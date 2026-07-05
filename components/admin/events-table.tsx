"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatEventDate, formatPrice } from "@/lib/utils";
import type { Category, Event, EventCategory } from "@prisma/client";

export function EventsTable({
  events,
  categoriesByValue,
}: {
  events: Event[];
  categoriesByValue: Record<EventCategory, Category>;
}) {
  const router = useRouter();
  const [items, setItems] = useState(events);

  async function handleDelete(id: string) {
    if (!confirm("Excluir este evento? Esta ação não pode ser desfeita.")) return;
    await fetch(`/api/events/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((e) => e.id !== id));
    router.refresh();
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-100 text-gray-500">
          <tr>
            <th className="p-3">Título</th>
            <th className="p-3">Categoria</th>
            <th className="p-3">Data</th>
            <th className="p-3">Preço</th>
            <th className="p-3">Status</th>
            <th className="p-3"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((event) => (
            <tr key={event.id} className="border-b border-gray-50">
              <td className="p-3 font-medium text-gray-900">{event.title}</td>
              <td className="p-3">{categoriesByValue[event.category]?.name}</td>
              <td className="p-3">{formatEventDate(new Date(event.dateStart))}</td>
              <td className="p-3">{formatPrice(event.price, event.isFree)}</td>
              <td className="p-3">{event.status}</td>
              <td className="flex gap-2 p-3">
                <Link href={`/admin/eventos/${event.id}/editar`}>
                  <Button variant="outline" size="sm">
                    Editar
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(event.id)}>
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
