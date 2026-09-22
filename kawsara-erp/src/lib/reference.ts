import { prisma } from "@/lib/prisma";
import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * Generateur de references uniques (section 55 du cahier des charges).
 * Format : PREFIXE-ANNEE-000001, sequence atomique via ReferenceCounter.
 */
export const REF_PREFIXES = {
  store: "BTQ",
  user: "USR",
  customer: "CLI",
  supplier: "FRN",
  product: "PRD",
  sale: "VNT",
  debit: "DEB",
  invoice: "FAC",
  payment: "PAI",
  debt: "DET",
  debtPayment: "REG",
  cashRegister: "CSE",
  supplierOrder: "CMF",
  supplierReceipt: "RCP",
  ecommerceOrder: "CMD",
} as const;

type RefKind = keyof typeof REF_PREFIXES;

type TxClient = PrismaClient | Prisma.TransactionClient;

export async function generateReference(kind: RefKind, tx: TxClient = prisma): Promise<string> {
  const year = new Date().getFullYear();
  const key = `${kind}-${year}`;
  const counter = await tx.referenceCounter.upsert({
    where: { key },
    create: { key, value: 1 },
    update: { value: { increment: 1 } },
  });
  const seq = counter.value.toString().padStart(6, "0");
  return `${REF_PREFIXES[kind]}-${year}-${seq}`;
}
