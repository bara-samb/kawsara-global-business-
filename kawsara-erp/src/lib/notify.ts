import "server-only";
import { prisma } from "@/lib/prisma";
import type { Role, Prisma, PrismaClient } from "@prisma/client";

type TxClient = PrismaClient | Prisma.TransactionClient;

/**
 * Notifications metier (cahier des charges section 49). Best-effort : une notification qui
 * echoue ne doit jamais faire echouer l'operation metier qui l'a declenchee.
 */
export async function notifyUser(userId: string, type: string, title: string, message: string, tx: TxClient = prisma) {
  try {
    await tx.notification.create({ data: { userId, type, title, message } });
  } catch {
    // Non-bloquant.
  }
}

export async function notifyRoles(
  roles: Role[],
  type: string,
  title: string,
  message: string,
  tx: TxClient = prisma
) {
  try {
    const users = await tx.user.findMany({ where: { role: { in: roles }, active: true }, select: { id: true } });
    if (users.length === 0) return;
    await tx.notification.createMany({
      data: users.map((u) => ({ userId: u.id, type, title, message })),
    });
  } catch {
    // Non-bloquant.
  }
}

export async function checkLowStockAndNotify(
  tx: TxClient,
  productId: string,
  storeId: string
) {
  try {
    const [stock, product] = await Promise.all([
      tx.stock.findUnique({ where: { productId_storeId: { productId, storeId } } }),
      tx.product.findUnique({ where: { id: productId } }),
    ]);
    if (!stock || !product) return;
    if (stock.quantity <= product.minThreshold) {
      const store = await tx.store.findUnique({ where: { id: storeId } });
      await notifyRoles(
        ["ADMIN", "GERANT", "MAGASINIER"],
        "STOCK_BAS",
        stock.quantity <= 0 ? "Rupture de stock" : "Stock bas",
        `${product.name} — ${stock.quantity} unite(s) restante(s) (seuil ${product.minThreshold}) a ${store?.name ?? ""}`,
        tx
      );
    }
  } catch {
    // Non-bloquant.
  }
}
