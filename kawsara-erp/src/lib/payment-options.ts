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

const NON_CASH_METHODS = ["WAVE", "ORANGE_MONEY", "VIREMENT", "CHEQUE"] as const;
type NonCashMethod = (typeof NON_CASH_METHODS)[number];

export function parsePaymentOption(value: string): { method: "ESPECES" | NonCashMethod; cashSessionId: string | null } {
  if (value.startsWith("CASH:") && value.length > 5) {
    return { method: "ESPECES", cashSessionId: value.slice(5) };
  }
  const method = value.slice("METHOD:".length);
  if (!value.startsWith("METHOD:") || !NON_CASH_METHODS.includes(method as NonCashMethod)) {
    throw new Error("Mode de paiement invalide.");
  }
  return { method: method as NonCashMethod, cashSessionId: null };
}

/**
 * Comme `parsePaymentOption`, mais verifie en plus qu'un paiement en especes est rattache a
 * une session de caisse reellement ouverte (et non a une caisse fermee ou inexistante).
 */
export async function resolvePaymentOption(tx: TxClient, value: string) {
  const option = parsePaymentOption(value);
  if (option.cashSessionId) {
    const session = await tx.cashSession.findUnique({
      where: { id: option.cashSessionId },
      select: { status: true },
    });
    if (!session || session.status !== "OUVERTE") {
      throw new Error("La caisse selectionnee n'est pas ouverte. Rechargez la page et choisissez une caisse ouverte.");
    }
  }
  return option;
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  ESPECES: "Especes",
  WAVE: "Wave",
  ORANGE_MONEY: "Orange Money",
  VIREMENT: "Banque (virement)",
  CHEQUE: "Cheque",
  AUTRE: "Autre",
};
