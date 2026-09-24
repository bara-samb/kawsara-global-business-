"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Phone, Wallet, StickyNote, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { useCartStore, cartTotal } from "@/lib/cart-store";
import { createEcommerceOrder } from "@/lib/actions/ecommerce";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";
import { whatsappUrl } from "@/lib/site-contact";

const PAYMENT_METHODS = [
  { value: "ESPECES", label: "Especes a la livraison" },
  { value: "WAVE", label: "Wave" },
  { value: "ORANGE_MONEY", label: "Orange Money" },
  { value: "VIREMENT", label: "Virement bancaire" },
];

export function CheckoutForm() {
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);
  const total = cartTotal(items);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    const formData = new FormData(e.currentTarget);
    const customerName = String(formData.get("customerName") ?? "");
    const customerEmail = String(formData.get("customerEmail") ?? "");
    const shippingAddress = String(formData.get("shippingAddress") ?? "");
    const shippingPhone = String(formData.get("shippingPhone") ?? "");
    const notes = String(formData.get("notes") ?? "");
    const paymentMethod = String(formData.get("paymentMethod") ?? "ESPECES") as
      | "ESPECES"
      | "WAVE"
      | "ORANGE_MONEY"
      | "VIREMENT";

    try {
      const order = await createEcommerceOrder({
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        customerName,
        customerEmail,
        shippingAddress,
        shippingPhone,
        notes: notes || undefined,
        paymentMethod,
      });
      if ("error" in order) {
        setError(order.error);
        setIsPending(false);
        return;
      }
      clear();
      router.push(`/commande/confirmation?reference=${encodeURIComponent(order.reference)}`);
    } catch {
      setError("Impossible de joindre le serveur. Verifiez votre connexion et reessayez.");
      setIsPending(false);
    }
  }

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-brand-green-200 bg-white p-8 text-center text-sm text-gray-500">
        Votre panier est vide.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-3">
      <div className="animate-fade-in-up lg:col-span-2 space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <div>
          <label className="text-sm font-medium text-brand-green-900">Nom complet</label>
          <input name="customerName" required minLength={2} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium text-brand-green-900">E-mail (optionnel)</label>
          <input type="email" name="customerEmail" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-brand-green-900">
            <MapPin className="h-4 w-4 text-brand-gold-600" />
            Adresse de livraison
          </label>
          <textarea
            name="shippingAddress"
            required
            rows={2}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm transition focus:border-brand-green-500 focus:outline-none focus:ring-2 focus:ring-brand-green-100"
          />
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-brand-green-900">
            <Phone className="h-4 w-4 text-brand-gold-600" />
            Telephone
          </label>
          <input
            name="shippingPhone"
            required
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm transition focus:border-brand-green-500 focus:outline-none focus:ring-2 focus:ring-brand-green-100"
          />
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-brand-green-900">
            <Wallet className="h-4 w-4 text-brand-gold-600" />
            Mode de paiement
          </label>
          <select name="paymentMethod" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm transition focus:border-brand-green-500 focus:outline-none focus:ring-2 focus:ring-brand-green-100">
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-brand-green-900">
            <StickyNote className="h-4 w-4 text-brand-gold-600" />
            Notes (optionnel)
          </label>
          <textarea name="notes" rows={2} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm transition focus:border-brand-green-500 focus:outline-none focus:ring-2 focus:ring-brand-green-100" />
        </div>
      </div>

      <div className="animate-fade-in-up h-fit rounded-xl border border-gray-200 bg-white p-6" style={{ animationDelay: "80ms" }}>
        <p className="text-sm font-semibold text-brand-green-900">Votre commande</p>
        <ul className="mt-3 space-y-2 text-sm">
          {items.map((item) => (
            <li key={item.productId} className="flex justify-between gap-2">
              <span className="text-gray-600">{item.quantity} × {item.name}</span>
              <span className="font-medium text-brand-green-900">
                {(item.unitPrice * item.quantity).toLocaleString("fr-FR")}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-sm font-semibold">
          <span>Total</span>
          <span>{total.toLocaleString("fr-FR")} FCFA</span>
        </div>

        {error && (
          <p className="animate-fade-in mt-3 flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-brand-gold-500 px-4 py-2.5 text-sm font-semibold text-brand-green-900 transition hover:bg-brand-gold-400 active:scale-95 disabled:opacity-60"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Envoi en cours...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Confirmer la commande
            </>
          )}
        </button>
        <a
          href={whatsappUrl()}
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex items-center justify-center gap-2 text-sm font-semibold text-green-600 hover:text-green-700 hover:underline"
        >
          <WhatsAppIcon className="h-5 w-5" />
          Une question ? Écrivez-nous sur WhatsApp
        </a>
      </div>
    </form>
  );
}
