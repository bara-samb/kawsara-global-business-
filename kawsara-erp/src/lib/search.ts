// Recherche tolerante utilisee partout (boutique, ERP) : insensible a la casse et aux accents,
// chaque mot saisi doit apparaitre quelque part ("cim 50" trouve "Ciment CEM II 50kg").
// Le filtrage se fait en JavaScript : Prisma `contains` est sensible a la casse sous PostgreSQL
// et ignore les accents nulle part.

export function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(query: string): string[] {
  return normalizeSearch(query).split(" ").filter(Boolean);
}

export function matchesQuery(haystack: string | (string | null | undefined)[], query: string): boolean {
  const terms = tokens(query);
  if (terms.length === 0) return true;
  const text = normalizeSearch(Array.isArray(haystack) ? haystack.filter(Boolean).join(" ") : haystack);
  return terms.every((t) => text.includes(t));
}

/**
 * Score de pertinence (plus petit = meilleur), ou null si aucun resultat :
 * 0 = le libelle commence par la saisie, 1 = un mot du libelle commence par la saisie,
 * 2 = la saisie apparait ailleurs (reference, categorie, milieu de mot).
 */
export function searchScore(label: string, extra: (string | null | undefined)[], query: string): number | null {
  if (!matchesQuery([label, ...extra], query)) return null;
  const q = normalizeSearch(query);
  const l = normalizeSearch(label);
  if (l.startsWith(q)) return 0;
  if (l.split(/[\s\-/(]+/).some((word) => word.startsWith(tokens(q)[0] ?? ""))) return 1;
  return 2;
}

export function rankByQuery<T>(
  items: T[],
  query: string,
  getLabel: (item: T) => string,
  getExtra: (item: T) => (string | null | undefined)[] = () => [],
): T[] {
  return items
    .map((item) => ({ item, score: searchScore(getLabel(item), getExtra(item), query) }))
    .filter((r): r is { item: T; score: number } => r.score !== null)
    .sort((a, b) => a.score - b.score || getLabel(a.item).localeCompare(getLabel(b.item), "fr"))
    .map((r) => r.item);
}
