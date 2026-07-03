import { listCategories } from "@/lib/services/categories";
import { categoryMap } from "@/lib/category-icons";
import { getFeaturedEvents, listEvents } from "@/lib/services/events";
import { CategoryScroller } from "@/components/events/category-scroller";
import { EventCard } from "@/components/events/event-card";
import { EmptyState } from "@/components/shared/empty-state";

export default async function HomePage() {
  const [categories, featured, upcoming] = await Promise.all([
    listCategories(),
    getFeaturedEvents(),
    listEvents({ status: "ATIVO" }),
  ]);
  const categoriesByValue = categoryMap(categories);

  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Categorias</h2>
        <CategoryScroller categories={categories} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Destaques da Semana</h2>
        {featured.length === 0 ? (
          <EmptyState title="Nenhum destaque no momento" />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((event) => (
              <EventCard key={event.id} event={event} category={categoriesByValue[event.category]} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Próximos Eventos</h2>
        {upcoming.length === 0 ? (
          <EmptyState title="Nenhum evento programado" />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((event) => (
              <EventCard key={event.id} event={event} category={categoriesByValue[event.category]} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
