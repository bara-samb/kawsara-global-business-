import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { describeForbidden } from "@/lib/permissions";
import { parseReportRange, getInvoicesInRange } from "@/lib/reports";
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

  const invoices = await getInvoicesInRange(range);
  const csv = toCsv(
    invoices.map((inv) => ({
      reference: inv.reference,
      date: inv.createdAt.toLocaleDateString("fr-FR"),
      client: inv.customer?.name ?? "Client comptant",
      boutique: inv.store.name,
      total: inv.total,
      statut: inv.status,
    })),
    [
      { key: "reference", label: "Reference" },
      { key: "date", label: "Date" },
      { key: "client", label: "Client" },
      { key: "boutique", label: "Boutique" },
      { key: "total", label: "Total (FCFA)" },
      { key: "statut", label: "Statut" },
    ]
  );

  await prisma.auditLog.create({
    data: { userId: user.id, action: "EXPORT", entity: "Report", metadata: "ventes.csv" },
  });
  return csvResponse(csv, "ventes.csv");
}
