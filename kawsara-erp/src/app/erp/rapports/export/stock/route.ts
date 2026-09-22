import { requirePermission } from "@/lib/require-permission";
import { getLowStockReport } from "@/lib/reports";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET(request: Request) {
  const user = await requirePermission("report.view");
  const url = new URL(request.url);
  const storeId = url.searchParams.get("storeId") ?? user.storeId;

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

  return csvResponse(csv, "stock-bas.csv");
}
