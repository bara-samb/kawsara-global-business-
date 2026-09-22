"use client";

import { useRouter } from "next/navigation";

export function DepotSwitcher({
  stores,
  currentStoreId,
}: {
  stores: { id: string; name: string }[];
  currentStoreId: string;
}) {
  const router = useRouter();
  return (
    <div>
      <label className="text-sm font-medium text-brand-green-900">Depot</label>
      <select
        name="storeId"
        defaultValue={currentStoreId}
        onChange={(e) => router.push(`?storeId=${e.target.value}`)}
        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      >
        {stores.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
    </div>
  );
}
