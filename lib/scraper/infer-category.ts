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

// Keywords match at a WORD START (leading \b), not anywhere: "curso" must not
// fire on "concurso"/"percurso". Deliberate prefixes still work because there is
// no trailing boundary — "gastronom" matches "gastronomia", "cine " matches
// "cine aberto". Compiled once per keyword.
const RULE_MATCHERS: [EventCategory, RegExp[]][] = RULES.map(([category, keywords]) => [
  category,
  keywords.map((k) => new RegExp("\\b" + k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))),
]);

export function inferCategory(title: string, description: string): EventCategory {
  const haystack = normalize(`${title} ${description}`);
  for (const [category, matchers] of RULE_MATCHERS) {
    if (matchers.some((re) => re.test(haystack))) return category;
  }
  return "OUTRO";
}
