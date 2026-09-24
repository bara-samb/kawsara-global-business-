import type { Prisma, PrismaClient } from "@prisma/client";
import { UserError } from "@/lib/errors";

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

const NON_CASH_METHODS = ["WAVE", "ORANGE_MONEY", "VIREMENT", "CHEQUE"] as const;

/**
 * Version sure de parsePaymentOption pour les Server Actions : la valeur vient du navigateur,
 * on verifie donc que le mode existe et que la caisse visee est bien OUVERTE et appartient a la
 * boutique de l'utilisateur (sinon on pourrait encaisser dans une caisse fermee ou etrangere).
 */
export async function resolvePaymentOption(
  tx: TxClient,
  value: string,
  user: { storeId: string | null }
): Promise<ReturnType<typeof parsePaymentOption>> {
  const option = parsePaymentOption(value);
  if (option.cashSessionId) {
    const session = await tx.cashSession.findUnique({
      where: { id: option.cashSessionId },
      include: { cashRegister: true },
    });
    if (!session || session.status !== "OUVERTE") {
      throw new UserError("Cette caisse n'est pas ouverte. Choisissez une caisse ouverte ou un autre mode de paiement.");
    }
    if (user.storeId && session.cashRegister.storeId !== user.storeId) {
      throw new UserError("Acces refuse : vous ne pouvez encaisser que dans une caisse de votre boutique.");
    }
    return option;
  }
  if (!(NON_CASH_METHODS as readonly string[]).includes(option.method)) {
    throw new UserError("Mode de paiement invalide.");
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
