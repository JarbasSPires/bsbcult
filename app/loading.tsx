import { Skeleton } from "@/components/ui/skeleton";
import { EventGridSkeleton } from "@/components/events/event-grid-skeleton";

export default function HomeLoading() {
  return (
    <div className="space-y-10">
      <section>
        <Skeleton className="mb-3 h-6 w-32" />
        <div className="flex gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-24 shrink-0" />
          ))}
        </div>
      </section>
      <section>
        <Skeleton className="mb-3 h-6 w-48" />
        <EventGridSkeleton />
      </section>
      <section>
        <Skeleton className="mb-3 h-6 w-40" />
        <EventGridSkeleton />
      </section>
    </div>
  );
}
