"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { rankByQuery } from "@/lib/search";

export type Suggestion = {
  id: string;
  label: string;
  /** Ligne secondaire affichee sous le libelle (reference, prix, stock...). */
  detail?: string;
  /** Textes supplementaires sur lesquels la recherche porte aussi (reference, categorie...). */
  keywords?: (string | null | undefined)[];
};

type Rect = { left: number; top: number; width: number };

/**
 * Champ de saisie avec suggestions des la premiere lettre tapee (recherche insensible a la
 * casse et aux accents, voir lib/search.ts). Navigation clavier : fleches, Entree, Echap.
 * La liste est rendue dans document.body en position fixe : elle n'est donc jamais coupee par
 * un tableau a defilement horizontal ou une carte `overflow-hidden`.
 */
export function SuggestInput({
  value,
  onChange,
  suggestions,
  onSelect,
  id,
  name,
  placeholder,
  className,
  maxResults = 8,
  emptyText = "Aucun resultat",
  ariaLabel,
  required,
}: {
  value: string;
  onChange: (value: string) => void;
  suggestions: Suggestion[];
  onSelect: (suggestion: Suggestion) => void;
  id?: string;
  name?: string;
  placeholder?: string;
  className?: string;
  maxResults?: number;
  emptyText?: string;
  ariaLabel?: string;
  required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [rect, setRect] = useState<Rect | null>(null);

  const results = useMemo(
    () =>
      value.trim()
        ? rankByQuery(suggestions, value, (s) => s.label, (s) => [s.detail, ...(s.keywords ?? [])]).slice(0, maxResults)
        : [],
    [suggestions, value, maxResults],
  );
  const showList = open && value.trim().length > 0 && rect !== null;

  const measure = useCallback(() => {
    const r = inputRef.current?.getBoundingClientRect();
    if (r) setRect({ left: r.left, top: r.bottom, width: r.width });
  }, []);

  // Suit l'input quand la page (ou un conteneur) defile ou que la fenetre change de taille.
  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [open, measure]);

  function choose(suggestion: Suggestion) {
    onSelect(suggestion);
    setOpen(false);
    setActiveIndex(-1);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      measure();
      setOpen(true);
      setActiveIndex((i) => (results.length ? (i + 1) % results.length : -1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (results.length ? (i <= 0 ? results.length - 1 : i - 1) : -1));
    } else if (event.key === "Enter" && showList && activeIndex >= 0 && results[activeIndex]) {
      event.preventDefault();
      choose(results[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        id={id}
        name={name}
        value={value}
        required={required}
        aria-label={ariaLabel}
        onChange={(event) => {
          onChange(event.target.value);
          measure();
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => {
          measure();
          setOpen(true);
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        className={className}
      />
      {showList &&
        createPortal(
          <ul
            id={listId}
            role="listbox"
            style={{ left: rect.left, top: rect.top + 4, width: Math.max(rect.width, 240) }}
            className="animate-scale-in fixed z-[60] max-h-80 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 text-left shadow-xl"
          >
            {results.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-500">{emptyText}</li>
            ) : (
              results.map((s, i) => (
                <li
                  key={s.id}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === activeIndex}
                  // mousedown (et non click) : le choix est fait avant que l'input perde le focus.
                  onMouseDown={(event) => {
                    event.preventDefault();
                    choose(s);
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`cursor-pointer px-3 py-2 ${i === activeIndex ? "bg-brand-green-50" : ""}`}
                >
                  <p className="truncate text-sm font-medium text-brand-green-900">{s.label}</p>
                  {s.detail && <p className="truncate text-xs text-gray-500">{s.detail}</p>}
                </li>
              ))
            )}
          </ul>,
          document.body,
        )}
    </>
  );
}
