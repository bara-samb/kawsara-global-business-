"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SuggestInput, type Suggestion } from "@/components/suggest-input";

export type SearchableProduct = {
  id: string;
  name: string;
  reference: string;
  price: number;
  category?: string | null;
};

/**
 * Champ de recherche produit (a placer dans un <form method="get">) : propose des produits des
 * la premiere lettre. Choisir une suggestion ouvre directement la fiche (`hrefBase` + id) ; valider
 * sans choisir soumet le formulaire avec le texte saisi (parametre `name`, "q" par defaut).
 */
export function ProductSearchInput({
  products,
  hrefBase,
  defaultValue = "",
  id,
  name = "q",
  placeholder,
  className,
}: {
  products: SearchableProduct[];
  /** Prefixe de la fiche produit, ex. "/catalogue/" (une fonction ne peut pas venir d'un composant serveur). */
  hrefBase: string;
  defaultValue?: string;
  id?: string;
  name?: string;
  placeholder?: string;
  className?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  const suggestions = useMemo<Suggestion[]>(
    () =>
      products.map((p) => ({
        id: p.id,
        label: p.name,
        detail: [p.category, `${p.price.toLocaleString("fr-FR")} FCFA`].filter(Boolean).join(" · "),
        keywords: [p.reference],
      })),
    [products],
  );

  return (
    <SuggestInput
      id={id}
      name={name}
      value={value}
      onChange={setValue}
      suggestions={suggestions}
      onSelect={(s) => {
        setValue(s.label);
        router.push(`${hrefBase}${s.id}`);
      }}
      placeholder={placeholder}
      emptyText="Aucun produit trouvé"
      className={className}
    />
  );
}
