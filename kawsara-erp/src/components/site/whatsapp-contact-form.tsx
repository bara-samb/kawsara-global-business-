"use client";

import { useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { whatsappUrl } from "@/lib/site-contact";

const SUBJECTS = [
  "Question sur un produit",
  "Demande de devis",
  "Suivi de ma commande",
  "Commande en gros",
  "Autre demande",
];

const FIELD =
  "mt-1 w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 transition placeholder:text-gray-400 focus:border-brand-green-600 focus:outline-none focus:ring-2 focus:ring-brand-green-100";

/**
 * Formulaire de contact sans serveur d'email : le message est mis en forme puis ouvert dans
 * WhatsApp (application ou WhatsApp Web), ou le client n'a plus qu'a appuyer sur "Envoyer".
 * Aucune donnee n'est enregistree par le site.
 */
export function WhatsAppContactForm() {
  const [subject, setSubject] = useState(SUBJECTS[0]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const reference = String(form.get("reference") ?? "").trim();
    const message = String(form.get("message") ?? "").trim();

    const text = [
      `Bonjour Kawsara Global Business,`,
      "",
      `*${subject}*`,
      reference ? `Reference de commande : ${reference}` : null,
      "",
      message,
      "",
      `- ${name}`,
    ]
      .filter((line) => line !== null)
      .join("\n");

    window.open(whatsappUrl(text), "_blank", "noopener,noreferrer");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="text-sm font-semibold text-brand-green-900">Votre nom</label>
          <input id="contact-name" name="name" required maxLength={80} autoComplete="name" placeholder="Ex. Moussa Diop" className={FIELD} />
        </div>
        <div>
          <label htmlFor="contact-subject" className="text-sm font-semibold text-brand-green-900">Sujet</label>
          <select id="contact-subject" value={subject} onChange={(e) => setSubject(e.target.value)} className={FIELD}>
            {SUBJECTS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {subject === "Suivi de ma commande" && (
        <div className="animate-fade-in">
          <label htmlFor="contact-reference" className="text-sm font-semibold text-brand-green-900">
            Reference de commande <span className="font-normal text-gray-400">(affichee apres votre commande)</span>
          </label>
          <input id="contact-reference" name="reference" maxLength={40} placeholder="Ex. CMD-2026-000012" className={FIELD} />
        </div>
      )}

      <div>
        <label htmlFor="contact-message" className="text-sm font-semibold text-brand-green-900">Votre message</label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={5}
          maxLength={1500}
          placeholder="Decrivez votre besoin : produit, quantite, adresse de livraison..."
          className={`${FIELD} resize-y`}
        />
      </div>

      <button
        type="submit"
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 font-bold text-white shadow-lg shadow-[#25D366]/30 transition hover:bg-[#1ebe5a] active:scale-[0.98] sm:w-auto"
      >
        <Send className="h-4 w-4" aria-hidden />
        Envoyer sur WhatsApp
      </button>
      <p className="text-xs text-gray-500">
        Votre message s&apos;ouvre dans WhatsApp, pret a etre envoye. Rien n&apos;est enregistre sur ce site.
      </p>
    </form>
  );
}
