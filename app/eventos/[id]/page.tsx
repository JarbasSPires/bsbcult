import { notFound } from "next/navigation";
import Image from "next/image";
import { getEventById, getRelatedEvents } from "@/lib/services/events";
import { listCategories } from "@/lib/services/categories";
import { categoryMap } from "@/lib/category-icons";
import { CategoryBadge } from "@/components/events/category-badge";
import { EventCard } from "@/components/events/event-card";
import { ShareButton } from "@/components/events/share-button";
import { FavoriteButton } from "@/components/events/favorite-button";
import { formatPrice, formatEventDate, parseTags } from "@/lib/utils";
import { MapPin } from "lucide-react";

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const event = await getEventById(params.id);
  if (!event) notFound();

  const [categories, related] = await Promise.all([
    listCategories(),
    getRelatedEvents(event),
  ]);
  const categoriesByValue = categoryMap(categories);
  const category = categoriesByValue[event.category];
  const tags = parseTags(event.tags);

  return (
    <div className="space-y-8">
      <div className="relative h-64 w-full overflow-hidden rounded-2xl sm:h-80">
        <Image src={event.imageUrl} alt={event.title} fill className="object-cover" unoptimized />
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <CategoryBadge category={category} />
          <span className="text-sm text-gray-500">{formatEventDate(event.dateStart)}</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
        <p className="whitespace-pre-line text-gray-700">{event.description}</p>

        <div className="flex items-start gap-2 text-gray-700">
          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
          <div>
            <p className="font-medium">{event.locationName}</p>
            <p className="text-sm text-gray-500">{event.locationAddress}</p>
          </div>
        </div>

        <p className={event.isFree ? "text-lg font-bold text-primary" : "text-lg font-bold text-gray-900"}>
          {formatPrice(event.price, event.isFree)}
        </p>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span key={tag} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <FavoriteButton eventId={event.id} />
          <ShareButton title={event.title} />
        </div>
      </div>

      {related.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Eventos Relacionados</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <EventCard key={r.id} event={r} category={categoriesByValue[r.category]} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
