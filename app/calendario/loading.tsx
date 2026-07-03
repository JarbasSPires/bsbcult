import { Skeleton } from "@/components/ui/skeleton";
import { EventGridSkeleton } from "@/components/events/event-grid-skeleton";

export default function CalendarLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-56" />
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <div className="flex gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-9 rounded-xl" />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 42 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <EventGridSkeleton count={3} />
      </div>
    </div>
  );
}
