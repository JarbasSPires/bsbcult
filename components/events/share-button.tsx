"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        console.error("Share failed:", err);
      }
    }
  }

  return (
    <Button variant="outline" onClick={handleShare}>
      <Share2 className="h-4 w-4" />
      {copied ? "Link copiado!" : "Compartilhar"}
    </Button>
  );
}
