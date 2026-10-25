"use client";

import { useMemo, useRef, useState } from "react";
import { SuggestInput, type Suggestion } from "@/components/suggest-input";

export type LineItemProduct = {
  id: string;
  reference: string;
  name: string;
  price: number;
  availableStock?: number;
};

type Row = {
  key: number;
  productId: string;
  productQuery: string;
  quantity: number;
  unitPrice: number;
};

const emptyRow = (key: number): Row => ({ key, productId: "", productQuery: "", quantity: 1, unitPrice: 0 });

export function LineItemsEditor({
  products,
  priceLabel = "P.U.",
  fieldName = "items",
}: {
  products: LineItemProduct[];
  priceLabel?: string;
  fieldName?: string;
}) {
  // Cles deterministes (identiques cote serveur et client) pour eviter une erreur d'hydratation.
  const nextKey = useRef(1);
  const [rows, setRows] = useState<Row[]>(() => [emptyRow(0)]);

  const suggestions = useMemo<Suggestion[]>(
    () =>
      products.map((p) => ({
        id: p.id,
        label: p.name,
        detail: [
          p.reference,
          `${p.price.toLocaleString("fr-FR")} FCFA`,
          p.availableStock !== undefined ? `Stock : ${p.availableStock}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
      })),
    [products],
  );

  function addRow() {
    const key = nextKey.current++;
    setRows((r) => [...r, emptyRow(key)]);
  }

  function removeRow(key: number) {
    setRows((r) => (r.length > 1 ? r.filter((row) => row.key !== key) : r));
  }

  function updateRow(key: number, patch: Partial<Row>) {
    setRows((r) => r.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function onProductTyped(key: number, productQuery: string) {
    // Saisie libre : le produit n'est retenu que s'il est choisi dans la liste (ou tape exactement).
    const product = products.find((p) => p.name === productQuery || `${p.name} (${p.reference})` === productQuery);
    updateRow(key, { productQuery, productId: product?.id ?? "", ...(product ? { unitPrice: product.price } : {}) });
  }

  function onProductChosen(key: number, suggestion: Suggestion) {
    const product = products.find((p) => p.id === suggestion.id);
    if (!product) return;
    updateRow(key, { productQuery: product.name, productId: product.id, unitPrice: product.price });
  }

  const validRows = rows.filter((r) => r.productId && r.quantity > 0);
  const total = validRows.reduce((s, r) => s + r.quantity * r.unitPrice, 0);

  return (
    <div>
      <input
        type="hidden"
        name={fieldName}
        value={JSON.stringify(
          validRows.map((r) => ({ productId: r.productId, quantity: r.quantity, unitPrice: r.unitPrice }))
        )}
      />
      <div className="overflow-x-auto rounded-md border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2.5">Produit</th>
              <th className="px-3 py-2.5">Qté</th>
              <th className="px-3 py-2.5">{priceLabel}</th>
              <th className="px-3 py-2.5 text-right">Total</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => {
              const product = products.find((p) => p.id === row.productId);
              const typedWithoutChoice = row.productQuery.trim() !== "" && !product;
              const overStock =
                product?.availableStock !== undefined && row.quantity > product.availableStock;
              return (
                <tr key={row.key} className="align-top">
                  <td className="px-3 py-2.5">
                    <SuggestInput
                      value={row.productQuery}
                      onChange={(value) => onProductTyped(row.key, value)}
                      onSelect={(s) => onProductChosen(row.key, s)}
                      suggestions={suggestions}
                      ariaLabel="Produit"
                      placeholder="Tapez le nom ou la réf. du produit..."
                      emptyText="Aucun produit trouvé"
                      className={`w-full min-w-[260px] rounded-md border px-3 py-2.5 text-sm ${
                        typedWithoutChoice ? "border-brand-gold-500" : "border-gray-300"
                      }`}
                    />
                    {product && (
                      <p className={`mt-1 text-xs ${overStock ? "font-semibold text-red-600" : "text-gray-400"}`}>
                        Réf. {product.reference}
                        {product.availableStock !== undefined && ` · Stock dispo : ${product.availableStock}`}
                      </p>
                    )}
                    {typedWithoutChoice && (
                      <p className="mt-1 text-xs text-brand-gold-700">Choisissez un produit dans la liste.</p>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      type="number"
                      min={1}
                      value={row.quantity}
                      aria-label="Quantité"
                      onChange={(e) => updateRow(row.key, { quantity: Number(e.target.value) })}
                      className="w-24 rounded-md border border-gray-300 px-3 py-2.5 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      type="number"
                      min={0}
                      value={row.unitPrice}
                      aria-label={priceLabel}
                      onChange={(e) => updateRow(row.key, { unitPrice: Number(e.target.value) })}
                      className="w-36 rounded-md border border-gray-300 px-3 py-2.5 text-sm"
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 pt-5 text-right font-medium text-brand-green-900">
                    {(row.quantity * row.unitPrice).toLocaleString("fr-FR")}
                  </td>
                  <td className="px-3 py-2.5 pt-5">
                    <button
                      type="button"
                      onClick={() => removeRow(row.key)}
                      className="text-xs font-semibold text-red-500 hover:text-red-700"
                    >
                      Retirer
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <button
          type="button"
          onClick={addRow}
          className="text-sm font-semibold text-brand-green-700 hover:text-brand-green-800"
        >
          + Ajouter une ligne
        </button>
        <p className="text-sm font-semibold text-brand-green-900">
          Total : {total.toLocaleString("fr-FR")} FCFA
        </p>
      </div>
    </div>
  );
}
