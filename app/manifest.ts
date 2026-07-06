import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BsbCult — Guia Cultural de Brasília",
    short_name: "BsbCult",
    description:
      "Seu guia definitivo para a vida cultural no Distrito Federal: shows, festivais, teatro, exposições e cinema.",
    start_url: "/",
    display: "standalone",
    background_color: "#f9fafb",
    theme_color: "#6366f1",
    icons: [{ src: "/icon", sizes: "512x512", type: "image/png" }],
  };
}
