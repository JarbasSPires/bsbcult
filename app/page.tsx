import { listCategories } from "@/lib/services/categories";
import { categoryMap } from "@/lib/category-icons";
import { getUpcomingHighlights, getUpcomingEventsExcludingSources } from "@/lib/services/events";
import { CategoryScroller } from "@/components/events/category-scroller";
import { EventCard } from "@/components/events/event-card";
import { EmptyState } from "@/components/shared/empty-state";

// Events from these sources power the "Destaques" section; everything else is
// grouped into per-category sections below.
const HIGHLIGHT_SOURCES = ["shotgun", "sympla"];

export default async function HomePage() {
  const [categories, highlights, rest] = await Promise.all([
    listCategories(),
    getUpcomingHighlights(HIGHLIGHT_SOURCES),
    getUpcomingEventsExcludingSources(HIGHLIGHT_SOURCES),
  ]);
  const categoriesByValue = categoryMap(categories);

  // One section per category that actually has upcoming events, in the
  // categories' own ordering.
  const sections = categories
    .map((category) => ({
      category,
      events: rest.filter((event) => event.category === category.value),
    }))
    .filter((section) => section.events.length > 0);

  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Categorias</h2>
        <CategoryScroller categories={categories.filter((c) => c.value !== "OUTRO")} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Destaques da Semana</h2>
        {highlights.length === 0 ? (
          <EmptyState title="Nenhum destaque no momento" />
        ) : (
          <div className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2">
            {highlights.map((event) => (
              <div key={event.id} className="w-72 shrink-0 snap-start">
                <EventCard event={event} category={categoriesByValue[event.category]} />
              </div>
            ))}
          </div>
        )}
      </section>

      {sections.length === 0 ? (
        <section>
          <EmptyState title="Nenhum evento programado" />
        </section>
      ) : (
        sections.map(({ category, events }) => (
          <section key={category.id}>
            <div className="mb-3 flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: category.color }}
                aria-hidden
              />
              <h2 className="text-lg font-semibold text-gray-900">{category.name}</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <EventCard key={event.id} event={event} category={categoriesByValue[event.category]} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
