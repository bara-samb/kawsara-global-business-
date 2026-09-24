import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { describeForbidden } from "@/lib/permissions";
import { getLowStockReport } from "@/lib/reports";
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
  // Un employe rattache a une boutique ne peut exporter que le stock de celle-ci.
  const storeId = user.storeId ?? url.searchParams.get("storeId");

  const lowStock = await getLowStockReport(storeId);
  const csv = toCsv(
    lowStock.map((s) => ({
      reference: s.reference,
      nom: s.name,
      boutique: s.store,
      stock: s.quantity,
      seuil: s.minThreshold,
    })),
    [
      { key: "reference", label: "Reference" },
      { key: "nom", label: "Produit" },
      { key: "boutique", label: "Boutique" },
      { key: "stock", label: "Stock actuel" },
      { key: "seuil", label: "Seuil minimum" },
    ]
  );

  await prisma.auditLog.create({
    data: { userId: user.id, action: "EXPORT", entity: "Report", metadata: "stock-bas.csv" },
  });
  return csvResponse(csv, "stock-bas.csv");
}
