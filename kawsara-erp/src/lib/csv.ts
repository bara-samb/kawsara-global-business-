function escapeCsvValue(value: unknown): string {
  let str = value === null || value === undefined ? "" : String(value);
  // Neutralise les formules (=, +, -, @) dans les textes saisis par les utilisateurs, pour
  // qu'Excel ne les execute pas a l'ouverture du fichier (injection CSV).
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
