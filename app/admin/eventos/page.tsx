import Link from "next/link";
import { listEvents } from "@/lib/services/events";
import { listCategories } from "@/lib/services/categories";
import { categoryMap } from "@/lib/category-icons";
import { EventsTable } from "@/components/admin/events-table";
import { Button } from "@/components/ui/button";

export default async function AdminEventsPage() {
  const [events, categories] = await Promise.all([listEvents({}), listCategories()]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Eventos</h2>
        <Link href="/admin/eventos/novo">
          <Button>Novo Evento</Button>
        </Link>
      </div>
      <EventsTable events={events} categoriesByValue={categoryMap(categories)} />
    </div>
  );
}
