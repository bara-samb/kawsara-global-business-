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

  const { products } = await getFullAggregates(range);
  const csv = toCsv(
    products.map((p) => ({
      reference: p.reference,
      nom: p.name,
      quantite: p.quantity,
      chiffreAffaires: p.revenue,
      coutAchat: p.cost,
      marge: p.profit,
    })),
    [
      { key: "reference", label: "Reference" },
      { key: "nom", label: "Produit" },
      { key: "quantite", label: "Quantite vendue" },
      { key: "chiffreAffaires", label: "Chiffre d'affaires (FCFA)" },
      { key: "coutAchat", label: "Cout d'achat (FCFA)" },
      { key: "marge", label: "Benefice (FCFA)" },
    ]
  );

  await prisma.auditLog.create({
    data: { userId: user.id, action: "EXPORT", entity: "Report", metadata: "produits.csv" },
  });
  return csvResponse(csv, "produits.csv");
}
