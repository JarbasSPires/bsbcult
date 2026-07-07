import { listCategories } from "@/lib/services/categories";
import { categoryMap } from "@/lib/category-icons";
import { listEvents } from "@/lib/services/events";
import { listEventSources } from "@/lib/services/event-sources";
import { SearchFilters } from "@/components/events/search-filters";
import { EventCard } from "@/components/events/event-card";
import { EmptyState } from "@/components/shared/empty-state";
import type { EventCategory } from "@prisma/client";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string; isFree?: string; sourceId?: string };
}) {
  const [categories, sources] = await Promise.all([listCategories(), listEventSources()]);
  const events = await listEvents({
    q: searchParams.q,
    category: (searchParams.category as EventCategory) || undefined,
    isFree: searchParams.isFree === undefined ? undefined : searchParams.isFree === "true",
    sourceId: searchParams.sourceId || undefined,
    status: "ATIVO",
  });
  const categoriesByValue = categoryMap(categories);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Buscar Eventos</h1>
      <SearchFilters categories={categories} sources={sources} />
      {events.length === 0 ? (
        <EmptyState
          title="Nenhum evento encontrado"
          description="Tente ajustar sua busca ou remover alguns filtros."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} category={categoriesByValue[event.category]} />
          ))}
        </div>
      )}
    </div>
  );
}
