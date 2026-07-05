import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listFavoritesForUser } from "@/lib/services/favorites";
import { listCategories } from "@/lib/services/categories";
import { categoryMap } from "@/lib/category-icons";
import { FavoritesList } from "@/components/events/favorites-list";

export default async function FavoritesPage() {
  const session = await getServerSession(authOptions);
  const [categories, events] = await Promise.all([
    listCategories(),
    session ? listFavoritesForUser(session.user.id) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Meus Favoritos</h1>
      <FavoritesList initialEvents={events} categoriesByValue={categoryMap(categories)} />
    </div>
  );
}
