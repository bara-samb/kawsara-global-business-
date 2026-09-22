import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * Construit les options du selecteur "Mode de paiement" : une option par caisse actuellement
 * ouverte (paiement en especes, rattache a cette session de caisse) + les modes non-especes.
 * La valeur encodee ("CASH:<cashSessionId>" ou "METHOD:<enum>") est decodee par
 * `parsePaymentOption` cote serveur.
 */
export type PaymentOption = { value: string; label: string };

type TxClient = PrismaClient | Prisma.TransactionClient;

export async function getPaymentOptions(tx: TxClient): Promise<PaymentOption[]> {
  const openSessions = await tx.cashSession.findMany({
    where: { status: "OUVERTE" },
    include: { cashRegister: true },
    orderBy: { openedAt: "asc" },
  });

  const cashOptions: PaymentOption[] = openSessions.map((s) => ({
    value: `CASH:${s.id}`,
    label: `${s.cashRegister.name} (especes)`,
  }));

  return [
    ...cashOptions,
    { value: "METHOD:WAVE", label: "Wave" },
    { value: "METHOD:ORANGE_MONEY", label: "Orange Money" },
    { value: "METHOD:VIREMENT", label: "Banque (virement)" },
    { value: "METHOD:CHEQUE", label: "Cheque" },
  ];
}

export function parsePaymentOption(value: string): { method: "ESPECES" | "WAVE" | "ORANGE_MONEY" | "VIREMENT" | "CHEQUE"; cashSessionId: string | null } {
  if (value.startsWith("CASH:")) {
    return { method: "ESPECES", cashSessionId: value.slice(5) };
  }
  const method = value.slice("METHOD:".length) as "WAVE" | "ORANGE_MONEY" | "VIREMENT" | "CHEQUE";
  return { method, cashSessionId: null };
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  ESPECES: "Especes",
  WAVE: "Wave",
  ORANGE_MONEY: "Orange Money",
  VIREMENT: "Banque (virement)",
  CHEQUE: "Cheque",
  AUTRE: "Autre",
};
