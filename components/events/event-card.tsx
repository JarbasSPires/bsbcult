import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { CategoryBadge } from "@/components/events/category-badge";
import { formatPrice, formatEventDate } from "@/lib/utils";
import { MapPin } from "lucide-react";
import type { Category } from "@prisma/client";

interface EventCardEvent {
  id: string;
  title: string;
  imageUrl: string;
  locationName: string;
  dateStart: Date;
  price: number | null;
  isFree: boolean;
}

export function EventCard({
  event,
  category,
}: {
  event: EventCardEvent;
  category: Pick<Category, "name" | "color" | "icon">;
}) {
  return (
    <Link href={`/eventos/${event.id}`}>
      <Card className="overflow-hidden">
        <div className="relative h-40 w-full">
          <Image src={event.imageUrl} alt={event.title} fill className="object-cover" unoptimized />
          <div className="absolute left-3 top-3">
            <CategoryBadge category={category} />
          </div>
        </div>
        <div className="space-y-2 p-4">
          <h3 className="line-clamp-1 font-semibold text-gray-900">{event.title}</h3>
          <p className="text-sm text-gray-500">{formatEventDate(event.dateStart)}</p>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <MapPin className="h-4 w-4" />
            <span className="line-clamp-1">{event.locationName}</span>
          </div>
          <p className={event.isFree ? "font-semibold text-primary" : "font-semibold text-gray-800"}>
            {event.isFree || event.price != null ? formatPrice(event.price, event.isFree) : "Confira o valor no site oficial"}
          </p>
        </div>
      </Card>
    </Link>
  );
}
