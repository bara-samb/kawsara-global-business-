"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

export const THEME_STORAGE_KEY = "kawsara-theme";

/**
 * Applique le theme avant le premier affichage (script inline dans <head>, voir app/layout.tsx) :
 * choix memorise, sinon preference du systeme. Evite un flash blanc en mode sombre.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}})();`;

// La classe .dark sur <html> est la source de verite ; tous les boutons de la page (header,
// menu...) sont notifies quand elle change.
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function isDark() {
  return document.documentElement.classList.contains("dark");
}

function setTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, dark ? "dark" : "light");
  } catch {
    // Stockage indisponible (navigation privee) : le choix vaut pour la page en cours.
  }
  listeners.forEach((l) => l());
}

export function ThemeToggle({ className }: { className?: string }) {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);

  return (
    <button
      type="button"
      onClick={() => setTheme(!dark)}
      aria-label={dark ? "Passer en mode clair" : "Passer en mode sombre"}
      title={dark ? "Mode clair" : "Mode sombre"}
      className={
        className ??
        "flex h-9 w-9 items-center justify-center rounded-md text-brand-green-800 transition hover:bg-brand-green-50 active:scale-90"
      }
    >
      {dark ? <Sun className="h-5 w-5 text-brand-gold-500" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
