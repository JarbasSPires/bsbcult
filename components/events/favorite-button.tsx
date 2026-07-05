"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FavoriteButton({ eventId }: { eventId: string }) {
  const { status } = useSession();
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/favorites")
      .then((res) => res.json())
      .then((events: { id: string }[]) => setIsFavorite(events.some((e) => e.id === eventId)));
  }, [status, eventId]);

  async function toggleFavorite() {
    if (status !== "authenticated") {
      router.push(`/login?callbackUrl=/eventos/${eventId}`);
      return;
    }
    setLoading(true);
    if (isFavorite) {
      await fetch(`/api/favorites/${eventId}`, { method: "DELETE" });
      setIsFavorite(false);
    } else {
      await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      setIsFavorite(true);
    }
    setLoading(false);
  }

  return (
    <Button variant={isFavorite ? "secondary" : "outline"} onClick={toggleFavorite} disabled={loading}>
      <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
      {isFavorite ? "Favoritado" : "Adicionar aos Favoritos"}
    </Button>
  );
}
