import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { describeForbidden } from "@/lib/permissions";
import { parseReportRange, getFullAggregates } from "@/lib/reports";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET(request: Request) {
  const user = await requirePermission("report.view").catch(() => null);
  if (!user) {
    return new Response(describeForbidden("report.view"), {
      status: 403,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
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

  await prisma.auditLog.create({
    data: { userId: user.id, action: "EXPORT", entity: "Report", metadata: "clients.csv" },
  });
  return csvResponse(csv, "clients.csv");
}
