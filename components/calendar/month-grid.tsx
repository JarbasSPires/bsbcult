"use client";

import { useEffect, useMemo, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  format,
  addMonths,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventCard } from "@/components/events/event-card";
import { EmptyState } from "@/components/shared/empty-state";
import { categoryMap } from "@/lib/category-icons";
import { cn } from "@/lib/utils";
import type { Category, EventCategory } from "@prisma/client";

interface CalendarEvent {
  id: string;
  title: string;
  imageUrl: string;
  locationName: string;
  dateStart: string;
  price: number | null;
  isFree: boolean;
  category: EventCategory;
}

export function MonthGrid({ categories }: { categories: Category[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const categoriesByValue = categoryMap(categories);

  const gridStart = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      dateFrom: gridStart.toISOString(),
      dateTo: gridEnd.toISOString(),
      status: "ATIVO",
    });
    fetch(`/api/events?${params.toString()}`, { signal: controller.signal })
      .then((res) => res.json())
      .then(setEvents)
      .catch((err) => {
        if (err.name !== "AbortError") throw err;
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = format(new Date(event.dateStart), "yyyy-MM-dd");
      map.set(key, [...(map.get(key) ?? []), event]);
    }
    return map;
  }, [events]);

  const selectedKey = format(selectedDay, "yyyy-MM-dd");
  const selectedEvents = eventsByDay.get(selectedKey) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold capitalize text-gray-900">
          {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth((m) => subMonths(m, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCurrentMonth(new Date());
              setSelectedDay(new Date());
            }}
          >
            Hoje
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth((m) => addMonths(m, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const hasEvents = eventsByDay.has(key);
          return (
            <button
              key={key}
              onClick={() => setSelectedDay(day)}
              className={cn(
                "flex h-12 flex-col items-center justify-center rounded-xl text-sm",
                !isSameMonth(day, currentMonth) ? "text-gray-300" : "text-gray-700",
                isSameDay(day, selectedDay) ? "bg-primary text-white" : "hover:bg-gray-100",
                isToday(day) && !isSameDay(day, selectedDay) && "font-bold text-primary"
              )}
            >
              {format(day, "d")}
              {hasEvents && <span className="h-1 w-1 rounded-full bg-secondary" />}
            </button>
          );
        })}
      </div>

      <section>
        <h3 className="mb-3 text-lg font-semibold text-gray-900">
          Eventos em {format(selectedDay, "dd 'de' MMMM", { locale: ptBR })}
        </h3>
        {selectedEvents.length === 0 ? (
          <EmptyState title="Nenhum evento neste dia" />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {selectedEvents.map((event) => (
              <EventCard
                key={event.id}
                event={{ ...event, dateStart: new Date(event.dateStart) }}
                category={categoriesByValue[event.category]}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
