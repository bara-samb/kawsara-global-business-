import { requirePermission } from "@/lib/require-permission";
import { parseReportRange, getFullAggregates } from "@/lib/reports";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET(request: Request) {
  const user = await requirePermission("report.view");
  const url = new URL(request.url);
  const range = parseReportRange(
    {
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
      storeId: url.searchParams.get("storeId") ?? undefined,
    },
    user.storeId
  );

  const { customers } = await getFullAggregates(range);
  const csv = toCsv(
    customers.map((c) => ({ client: c.name, commandes: c.orders, chiffreAffaires: c.revenue })),
    [
      { key: "client", label: "Client" },
      { key: "commandes", label: "Nombre de factures" },
      { key: "chiffreAffaires", label: "Chiffre d'affaires (FCFA)" },
    ]
  );

  return csvResponse(csv, "clients.csv");
}
