import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { listCategories } from "@/lib/services/categories";

describe("listCategories", () => {
  it("returns categories ordered by name", async () => {
    await prisma.category.createMany({
      data: [
        { name: "Teatro", value: "TEATRO", icon: "Theater", color: "#f97316", description: "Peças e espetáculos" },
        { name: "Cinema", value: "CINEMA", icon: "Film", color: "#6366f1", description: "Filmes e mostras" },
      ],
    });

    const result = await listCategories();
    expect(result.map((c) => c.name)).toEqual(["Cinema", "Teatro"]);
  });
});
