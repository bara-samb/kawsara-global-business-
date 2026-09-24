function escapeCsvValue(value: unknown): string {
  let str = value === null || value === undefined ? "" : String(value);
  // Anti-injection de formules : un texte saisi par un client (ex. nom "=HYPERLINK(...)") serait
  // execute par Excel a l'ouverture de l'export. Une apostrophe le force a rester du texte.
  // Les nombres (montants negatifs, etc.) ne sont pas concernes.
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",\n;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv(rows: Record<string, unknown>[], columns?: { key: string; label: string }[]): string {
  if (rows.length === 0 && !columns) return "";
  const cols = columns ?? Object.keys(rows[0]).map((key) => ({ key, label: key }));
  const header = cols.map((c) => escapeCsvValue(c.label)).join(";");
  const lines = rows.map((row) => cols.map((c) => escapeCsvValue(row[c.key])).join(";"));
  return ["﻿" + header, ...lines].join("\r\n");
}

export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
