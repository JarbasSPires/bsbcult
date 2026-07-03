import Link from "next/link";
import { getCategoryIcon } from "@/lib/category-icons";
import type { Category } from "@prisma/client";

export function CategoryScroller({ categories }: { categories: Category[] }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {categories.map((category) => {
        const Icon = getCategoryIcon(category.icon);
        return (
          <Link
            key={category.id}
            href={`/busca?category=${category.value}`}
            className="flex shrink-0 flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white px-5 py-3 shadow-sm hover:shadow-md"
          >
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full text-white"
              style={{ backgroundColor: category.color }}
            >
              <Icon className="h-5 w-5" />
            </span>
            <span className="text-xs font-medium text-gray-700">{category.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
