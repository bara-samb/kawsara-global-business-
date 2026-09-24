import { prisma } from "@/lib/prisma";
import { createSale } from "@/lib/actions/sales";
import { getPaymentOptions } from "@/lib/payment-options";
import { LineItemsEditor } from "@/components/erp/line-items-editor";
import { DepotSwitcher } from "@/components/erp/depot-switcher";
import { CustomerAutocomplete } from "@/components/erp/customer-autocomplete";
import { ActionForm } from "@/components/action-form";
import { requirePagePermission } from "@/lib/require-permission";

export default async function NouvelleVentePage({
  searchParams,
}: {
  searchParams: Promise<{ storeId?: string }>;
}) {
  await requirePagePermission("sale.create");
  const { storeId: storeIdParam } = await searchParams;

  const [stores, customers, paymentOptions] = await Promise.all([
    prisma.store.findMany({ orderBy: { name: "asc" } }),
    prisma.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, reference: true, phone: true } }),
    getPaymentOptions(prisma),
  ]);

  const storeId = storeIdParam || stores[0]?.id || "";

  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    include: { stocks: { where: { storeId } } },
  });

  const lineItemProducts = products.map((p) => {
    const stock = p.stocks[0];
    return {
      id: p.id,
      reference: p.reference,
      name: p.name,
      price: p.sellingPrice,
      availableStock: stock ? stock.quantity - stock.reserved : 0,
    };
  });

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold text-brand-green-900">Nouvelle vente</h1>
      <ActionForm action={createSale} className="mt-6 space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <div className="grid grid-cols-2 gap-4">
          <DepotSwitcher stores={stores} currentStoreId={storeId} />
          <CustomerAutocomplete customers={customers} />
        </div>

        <LineItemsEditor products={lineItemProducts} priceLabel="Prix de vente" />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-brand-green-900">Remise (FCFA)</label>
            <input type="number" name="discount" min={0} defaultValue={0} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-brand-green-900">Mode de paiement</label>
            <select name="paymentOption" required className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">— Choisir —</option>
              {paymentOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {!paymentOptions.some((o) => o.value.startsWith("CASH:")) && (
              <p className="mt-1 text-xs text-brand-gold-700">Aucune caisse ouverte pour un paiement en especes.</p>
            )}
          </div>
        </div>

        <button type="submit" className="rounded-md bg-brand-green-700 px-5 py-2.5 font-semibold text-white hover:bg-brand-green-800">
          Enregistrer la vente
        </button>
      </ActionForm>
    </div>
  );
}
