"use client";

import { useRef, useState } from "react";

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

export function LineItemsEditor({
  products,
  priceLabel = "Prix unitaire",
  fieldName = "items",
}: {
  products: LineItemProduct[];
  priceLabel?: string;
  fieldName?: string;
}) {
  // Cles deterministes (identiques cote serveur et client) pour eviter une erreur d'hydratation.
  const nextKey = useRef(1);
  const [rows, setRows] = useState<Row[]>(() => [
    { key: 0, productId: "", productQuery: "", quantity: 1, unitPrice: 0 },
  ]);

  function addRow() {
    const key = nextKey.current++;
    setRows((r) => [...r, { key, productId: "", productQuery: "", quantity: 1, unitPrice: 0 }]);
  }

  function removeRow(key: number) {
    setRows((r) => (r.length > 1 ? r.filter((row) => row.key !== key) : r));
  }

  function updateRow(key: number, patch: Partial<Row>) {
    setRows((r) => r.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function onProductChange(key: number, productQuery: string) {
    const product = products.find(
      (p) => `${p.name} (${p.reference})` === productQuery || p.id === productQuery,
    );
    updateRow(key, {
      productQuery,
      productId: product?.id ?? "",
      unitPrice: product?.price ?? 0,
    });
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
              <th className="px-3 py-2">Produit</th>
              <th className="px-3 py-2">Quantite</th>
              <th className="px-3 py-2">{priceLabel}</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => {
              const product = products.find((p) => p.id === row.productId);
              return (
                <tr key={row.key}>
                  <td className="px-3 py-2">
                    <input
                      value={row.productQuery}
                      onChange={(e) => onProductChange(row.key, e.target.value)}
                      list={`sale-products-${row.key}`}
                      placeholder="Rechercher un produit..."
                      autoComplete="off"
                      className="w-full min-w-[220px] rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                    />
                    <datalist id={`sale-products-${row.key}`}>
                      {products.map((p) => (
                        <option key={p.id} value={`${p.name} (${p.reference})`} />
                      ))}
                    </datalist>
                    {product && product.availableStock !== undefined && (
                      <p className="mt-1 text-xs text-gray-400">Stock disponible : {product.availableStock}</p>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={1}
                      value={row.quantity}
                      onChange={(e) => updateRow(row.key, { quantity: Number(e.target.value) })}
                      className="w-24 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      value={row.unitPrice}
                      onChange={(e) => updateRow(row.key, { unitPrice: Number(e.target.value) })}
                      className="w-28 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap font-medium text-brand-green-900">
                    {(row.quantity * row.unitPrice).toLocaleString("fr-FR")}
                  </td>
                  <td className="px-3 py-2">
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
