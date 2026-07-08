import type { EventCategory } from "@prisma/client";

export interface NormalizedEvent {
  externalId: string;
  title: string;
  description: string;
  category: EventCategory;
  imageUrl: string;
  locationName: string;
  locationAddress: string;
  dateStart: Date;
  dateEnd: Date;
  price: number | null;
  isFree: boolean;
  organizer: string;
  tags: string[];
  sourceUrl: string;
  ageRating: string | null;
  soldOut: boolean;
}

export interface EventSourceAdapter {
  slug: string;
  name: string;
  baseUrl: string;
  adapterType: "WORDPRESS" | "HTML";
  fetchEvents(): Promise<NormalizedEvent[]>;
}
