import { Music, PartyPopper, Theater, ImageIcon, Film, Store, Mic, UtensilsCrossed, Baby, Drum, Sparkles, type LucideIcon } from "lucide-react";
import type { Category, EventCategory } from "@prisma/client";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Music,
  PartyPopper,
  Theater,
  ImageIcon,
  Film,
  Store,
  Mic,
  UtensilsCrossed,
  Baby,
  Drum,
  Sparkles,
};

export function getCategoryIcon(name: string): LucideIcon {
  return CATEGORY_ICONS[name] ?? Sparkles;
}

export function categoryMap(categories: Category[]): Record<EventCategory, Category> {
  return Object.fromEntries(categories.map((c) => [c.value, c])) as Record<EventCategory, Category>;
}
