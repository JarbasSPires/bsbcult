import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { listFavoritesForUser, addFavorite, removeFavorite, isFavorite } from "@/lib/services/favorites";

let userId: string;
let eventId: string;

beforeEach(async () => {
  const user = await prisma.user.create({
    data: { name: "Dan", email: "dan@example.com", passwordHash: "x", role: "USER" },
  });
  const event = await prisma.event.create({
    data: {
      title: "Show Teste", description: "Desc", category: "SHOW", imageUrl: "https://example.com/i.jpg",
      locationName: "Local", locationAddress: "Endereço", dateStart: new Date(), dateEnd: new Date(),
      price: 10, isFree: false, organizer: "Org", tags: "[]", status: "ATIVO",
    },
  });
  userId = user.id;
  eventId = event.id;
});

describe("favorites", () => {
  it("adds and lists a favorite", async () => {
    await addFavorite(userId, eventId);
    const favorites = await listFavoritesForUser(userId);
    expect(favorites).toHaveLength(1);
    expect(favorites[0].id).toBe(eventId);
  });

  it("is idempotent when adding the same favorite twice", async () => {
    await addFavorite(userId, eventId);
    await addFavorite(userId, eventId);
    const favorites = await listFavoritesForUser(userId);
    expect(favorites).toHaveLength(1);
  });

  it("removes a favorite", async () => {
    await addFavorite(userId, eventId);
    await removeFavorite(userId, eventId);
    expect(await isFavorite(userId, eventId)).toBe(false);
  });

  it("reports isFavorite correctly", async () => {
    expect(await isFavorite(userId, eventId)).toBe(false);
    await addFavorite(userId, eventId);
    expect(await isFavorite(userId, eventId)).toBe(true);
  });
});
