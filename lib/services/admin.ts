import { prisma } from "@/lib/prisma";

export async function getDashboardMetrics() {
  const [totalEvents, activeEvents, totalUsers, totalFavorites] = await Promise.all([
    prisma.event.count(),
    prisma.event.count({ where: { status: "ATIVO" } }),
    prisma.user.count(),
    prisma.favorite.count(),
  ]);
  return { totalEvents, activeEvents, totalUsers, totalFavorites };
}
