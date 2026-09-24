"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

type Category = {
  id: string;
  name: string;
};

export function CategoryFilter({
  categories,
  selectedCategory,
  query,
}: {
  categories: Category[];
  selectedCategory?: string;
  query?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(categoryId: string) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (categoryId) params.set("categorie", categoryId);

    const search = params.toString();
    startTransition(() => {
      router.push(search ? `/catalogue?${search}` : "/catalogue");
    });
  }

  return (
    <select
      name="categorie"
      value={selectedCategory ?? ""}
      onChange={(event) => handleChange(event.target.value)}
      disabled={isPending}
      aria-label="Filtrer par catégorie"
      className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm disabled:cursor-wait disabled:opacity-70"
    >
      <option value="">Toutes categories</option>
      {categories.map((category) => (
        <option key={category.id} value={category.id}>
          {category.name}
        </option>
      ))}
    </select>
  );
}
