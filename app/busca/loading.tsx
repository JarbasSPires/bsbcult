import { Skeleton } from "@/components/ui/skeleton";
import { EventGridSkeleton } from "@/components/events/event-grid-skeleton";

export default function SearchLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-11 w-full" />
      <EventGridSkeleton />
    </div>
  );
}
