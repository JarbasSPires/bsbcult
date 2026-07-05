"use client";

import { useState } from "react";
import { HeartOff } from "lucide-react";
import { EventCard } from "@/components/events/event-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import type { Category, Event, EventCategory } from "@prisma/client";

export function FavoritesList({
  initialEvents,
  categoriesByValue,
}: {
  initialEvents: Event[];
  categoriesByValue: Record<EventCategory, Category>;
}) {
  const [events, setEvents] = useState(initialEvents);

  async function handleRemove(eventId: string) {
    await fetch(`/api/favorites/${eventId}`, { method: "DELETE" });
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  }

  if (events.length === 0) {
    return (
      <EmptyState
        icon={HeartOff}
        title="Você ainda não favoritou nenhum evento"
        description="Explore os eventos e toque no coração para salvá-los aqui."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <div key={event.id} className="space-y-2">
          <EventCard event={event} category={categoriesByValue[event.category]} />
          <Button variant="outline" size="sm" className="w-full" onClick={() => handleRemove(event.id)}>
            Remover dos Favoritos
          </Button>
        </div>
      ))}
    </div>
  );
}
