import type { EventCategory } from "@prisma/client";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

// Evaluated in order; first match wins. Keep multi-word/specific rules
// before generic ones (e.g. "festival gastronomico" is still FEIRA-free:
// FEIRA only matches the literal word "feira").
const RULES: [EventCategory, string[]][] = [
  ["FEIRA", ["feira", "bazar", "mercado de rua"]],
  ["PALESTRA", ["palestra", "workshop", "oficina", "curso", "seminario", "masterclass"]],
  ["INFANTIL", ["infantil", "crianca", "circo", "para a familia", "kids"]],
  ["GASTRONOMIA", ["gastronom", "culinar", "degustacao", "chef"]],
  ["CULTURA_POPULAR", ["choro", "forro", "cultura popular", "quadrilha", "folclor", "samba de raiz"]],
  ["TEATRO", ["teatro", "peca", "espetaculo teatral", "stand-up", "comedia"]],
  ["CINEMA", ["cinema", "filme", "mostra de cinema", "cine "]],
  ["EXPOSICAO", ["exposicao", "mostra de arte", "galeria", "vernissage"]],
  ["FESTIVAL", ["festival"]],
  ["SHOW", ["show", "banda", "ao vivo", "turne", "concerto", "dj "]],
];

export function inferCategory(title: string, description: string): EventCategory {
  const haystack = normalize(`${title} ${description}`);
  for (const [category, keywords] of RULES) {
    if (keywords.some((k) => haystack.includes(k))) return category;
  }
  return "OUTRO";
}
