import { prisma } from "@/lib/prisma";

export async function listFavoritesForUser(userId: string) {
  const favorites = await prisma.favorite.findMany({
    where: { userId },
    include: { event: true },
    orderBy: { createdAt: "desc" },
  });
  return favorites.map((f) => f.event);
}

export async function addFavorite(userId: string, eventId: string) {
  return prisma.favorite.upsert({
    where: { userId_eventId: { userId, eventId } },
    update: {},
    create: { userId, eventId },
  });
}

export async function removeFavorite(userId: string, eventId: string) {
  await prisma.favorite.deleteMany({ where: { userId, eventId } });
}

export async function isFavorite(userId: string, eventId: string) {
  const favorite = await prisma.favorite.findUnique({
    where: { userId_eventId: { userId, eventId } },
  });
  return !!favorite;
}
