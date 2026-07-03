import { Badge } from "@/components/ui/badge";
import { getCategoryIcon } from "@/lib/category-icons";
import type { Category } from "@prisma/client";

export function CategoryBadge({ category }: { category: Pick<Category, "name" | "color" | "icon"> }) {
  const Icon = getCategoryIcon(category.icon);
  return (
    <Badge style={{ backgroundColor: category.color }}>
      <Icon className="h-3.5 w-3.5" />
      {category.name}
    </Badge>
  );
}
