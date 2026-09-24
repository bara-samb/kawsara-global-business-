"use client";

import { useId, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import type { ActionResult } from "@/lib/errors";

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
};

/**
 * Formulaire relie a une Server Action (enveloppee par runAction) : affiche le message d'erreur
 * lisible renvoye par le serveur au lieu d'un ecran d'erreur technique.
 * Contrairement a <form action>, la saisie n'est effacee qu'en cas de succes : en cas d'erreur,
 * l'utilisateur corrige sans tout retaper.
 * Avec `confirm`, une fenetre de confirmation s'ouvre avant l'envoi (actions dangereuses).
 */
export function ActionForm({
  action,
  className,
  confirm,
  children,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  className?: string;
  confirm?: ConfirmOptions;
  children: ReactNode;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const pendingSubmit = useRef<{ form: HTMLFormElement; formData: FormData } | null>(null);

  function send(form: HTMLFormElement, formData: FormData) {
    startTransition(async () => {
      try {
        const result = await action(formData);
        if (result?.error) {
          setError(result.error);
        } else {
          setError(null);
          form.reset();
        }
      } catch {
        setError("Impossible de joindre le serveur. Verifiez votre connexion et reessayez.");
      }
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return; // evite les doubles envois (double vente, double paiement...)
    const form = event.currentTarget;
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const formData = new FormData(form, submitter);

    if (confirm) {
      pendingSubmit.current = { form, formData };
      dialogRef.current?.showModal();
      return;
    }
    send(form, formData);
  }

  function handleConfirm() {
    dialogRef.current?.close();
    const submit = pendingSubmit.current;
    pendingSubmit.current = null;
    if (submit) send(submit.form, submit.formData);
  }

  function handleCancel() {
    pendingSubmit.current = null;
    dialogRef.current?.close();
  }

  return (
    <form onSubmit={handleSubmit} className={className} aria-busy={pending}>
      {children}
      {error && (
        <p role="alert" className="basis-full w-full rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 [grid-column:1/-1]">
          {error}
        </p>
      )}
      {confirm && (
        <dialog
          ref={dialogRef}
          onCancel={handleCancel}
          aria-labelledby={titleId}
          className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-gray-200 bg-white p-0 text-left shadow-xl backdrop:bg-black/40"
        >
          <div className="p-5">
            <p id={titleId} className="text-base font-bold text-brand-green-900">{confirm.title}</p>
            <p className="mt-2 text-sm whitespace-pre-line text-gray-600">{confirm.message}</p>
            <p className="mt-3 text-xs text-gray-400">Cette action sera enregistree a votre nom dans le journal d&apos;audit.</p>
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3">
            <button
              type="button"
              onClick={handleCancel}
              autoFocus
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
            >
              Non, annuler
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              {confirm.confirmLabel ?? "Oui, confirmer"}
            </button>
          </div>
        </dialog>
      )}
    </form>
  );
}
