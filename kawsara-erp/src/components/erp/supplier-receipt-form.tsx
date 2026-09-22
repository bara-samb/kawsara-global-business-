"use client";

import { useState } from "react";

type OrderItemRow = {
  id: string;
  productName: string;
  quantity: number;
  receivedQuantity: number;
};

export function SupplierReceiptForm({ items }: { items: OrderItemRow[] }) {
  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries(items.map((i) => [i.id, Math.max(0, i.quantity - i.receivedQuantity)]))
  );

  const receipts = items.map((i) => ({ orderItemId: i.id, receivedNow: values[i.id] ?? 0 }));

  return (
    <div className="space-y-3">
      <input type="hidden" name="receipts" value={JSON.stringify(receipts)} />
      <table className="min-w-full text-sm">
        <thead className="text-left text-xs uppercase text-gray-500">
          <tr>
            <th className="py-1">Produit</th>
            <th className="py-1">Commande</th>
            <th className="py-1">Deja recu</th>
            <th className="py-1">Recu maintenant</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item) => {
            const remaining = item.quantity - item.receivedQuantity;
            return (
              <tr key={item.id}>
                <td className="py-2">{item.productName}</td>
                <td className="py-2">{item.quantity}</td>
                <td className="py-2 text-gray-500">{item.receivedQuantity}</td>
                <td className="py-2">
                  <input
                    type="number"
                    min={0}
                    max={remaining}
                    disabled={remaining <= 0}
                    value={values[item.id] ?? 0}
                    onChange={(e) => setValues((v) => ({ ...v, [item.id]: Number(e.target.value) }))}
                    className="w-24 rounded-md border border-gray-300 px-2 py-1.5 text-sm disabled:bg-gray-100"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
