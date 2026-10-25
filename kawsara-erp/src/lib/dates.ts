// Bornes de periode pour les statistiques (CA du jour, de la semaine, du mois...).
// La boutique est a Dakar (fuseau Africa/Dakar = UTC+0 toute l'annee, sans heure d'ete) : les
// calculs se font donc en UTC, explicitement. Avant, ils dependaient du fuseau du serveur
// (setHours), ce qui decalait les journees si le serveur n'etait pas regle sur UTC.

export function startOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

/** Lundi 00:00 de la semaine en cours. */
export function startOfWeek(date: Date = new Date()): Date {
  const d = startOfDay(date);
  const day = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - (day - 1));
  return d;
}

export function startOfMonth(date: Date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** "2026-10-25" : cle d'un jour (et valeur d'un <input type="date">). */
export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** "2026-10" : cle d'un mois. */
export function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

const monthFormat = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "Africa/Dakar" });

/** "octobre 2026" a partir de "2026-10". */
export function monthLabel(key: string): string {
  return monthFormat.format(new Date(`${key}-01T12:00:00Z`));
}
