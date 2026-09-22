"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateReference } from "@/lib/reference";
import { requirePermission } from "@/lib/require-permission";
import { parsePaymentOption } from "@/lib/payment-options";
import { notifyRoles, checkLowStockAndNotify } from "@/lib/notify";

// ---------- Boutique publique : passage de commande ----------

const checkoutItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
});

const checkoutSchema = z.object({
  items: z.array(checkoutItemSchema).min(1, "Le panier est vide."),
  shippingAddress: z.string().min(3, "Adresse de livraison obligatoire."),
  shippingPhone: z.string().min(6, "Telephone obligatoire."),
  notes: z.string().optional(),
  paymentMethod: z.enum(["ESPECES", "WAVE", "ORANGE_MONEY", "VIREMENT", "CHEQUE"]),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export async function createEcommerceOrder(input: CheckoutInput) {
  const user = await requirePermission("shop.order");
  const data = checkoutSchema.parse(input);

  // Verification de stock + choix du depot + reservation execute dans une seule transaction
  // pour eviter qu'une commande simultanee ne double-vende le meme stock (cahier des charges 39/51).
  const result = await prisma.$transaction(async (tx) => {
    let customerId = user.customerId ?? null;
    if (!customerId) {
      const reference = await generateReference("customer", tx);
      const customer = await tx.customer.create({
        data: { reference, name: user.name, email: user.email, userId: user.id },
      });
      customerId = customer.id;
    }

    const productIds = [...new Set(data.items.map((i) => i.productId))];
    const products = await tx.product.findMany({
      where: { id: { in: productIds }, active: true, onlineEnabled: true },
      include: { stocks: true },
    });
    if (products.length !== productIds.length) {
      throw new Error("Un ou plusieurs produits ne sont plus disponibles a la vente en ligne.");
    }

    for (const item of data.items) {
      const product = products.find((p) => p.id === item.productId)!;
      const totalAvailable = product.stocks.reduce((s, st) => s + Math.max(0, st.quantity - st.reserved), 0);
      if (totalAvailable < item.quantity) {
        throw new Error(`Stock insuffisant pour "${product.name}" (disponible : ${totalAvailable}).`);
      }
    }

    const stores = await tx.store.findMany({ orderBy: { createdAt: "asc" } });
    let chosenStoreId: string | null = null;
    for (const store of stores) {
      const fits = data.items.every((item) => {
        const product = products.find((p) => p.id === item.productId)!;
        const stock = product.stocks.find((s) => s.storeId === store.id);
        const available = (stock?.quantity ?? 0) - (stock?.reserved ?? 0);
        return available >= item.quantity;
      });
      if (fits) {
        chosenStoreId = store.id;
        break;
      }
    }

    const subtotal = data.items.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.productId)!;
      return sum + product.sellingPrice * item.quantity;
    }, 0);

    const reference = await generateReference("ecommerceOrder", tx);
    const order = await tx.ecommerceOrder.create({
      data: {
        reference,
        customerId: customerId!,
        storeId: chosenStoreId,
        subtotal,
        total: subtotal,
        shippingAddress: data.shippingAddress,
        shippingPhone: data.shippingPhone,
        notes: data.notes || null,
        paymentMethod: data.paymentMethod,
        items: {
          create: data.items.map((item) => {
            const product = products.find((p) => p.id === item.productId)!;
            return {
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: product.sellingPrice,
            };
          }),
        },
      },
    });

    if (chosenStoreId) {
      for (const item of data.items) {
        await tx.stock.update({
          where: { productId_storeId: { productId: item.productId, storeId: chosenStoreId } },
          data: { reserved: { increment: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            storeId: chosenStoreId,
            type: "RESERVATION",
            quantity: item.quantity,
            reference,
            reason: "Reservation commande en ligne",
            userId: user.id,
          },
        });
      }
    }

    await tx.auditLog.create({
      data: { userId: user.id, action: "CREATE", entity: "EcommerceOrder", entityId: order.id },
    });

    await notifyRoles(
      ["ADMIN", "GERANT", "CAISSIER"],
      "NOUVELLE_COMMANDE",
      "Nouvelle commande en ligne",
      `Commande ${order.reference} — ${subtotal.toLocaleString("fr-FR")} FCFA.`,
      tx
    );

    return { id: order.id, reference: order.reference };
  });

  revalidatePath("/erp/commandes-en-ligne");
  revalidatePath("/compte/commandes");
  return result;
}

// ---------- Espace gestion (ERP) : traitement des commandes en ligne ----------

const assignStoreSchema = z.object({ storeId: z.string().min(1, "Depot obligatoire.") });

export async function assignEcommerceOrderStore(orderId: string, formData: FormData) {
  const user = await requirePermission("ecommerceOrder.process");
  const data = assignStoreSchema.parse({ storeId: formData.get("storeId") });

  await prisma.$transaction(async (tx) => {
    const order = await tx.ecommerceOrder.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order || order.storeId) throw new Error("Cette commande a deja un depot assigne.");

    for (const item of order.items) {
      const stock = await tx.stock.findUnique({
        where: { productId_storeId: { productId: item.productId, storeId: data.storeId } },
      });
      const available = (stock?.quantity ?? 0) - (stock?.reserved ?? 0);
      if (available < item.quantity) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        throw new Error(`Stock insuffisant pour "${product?.name ?? item.productId}" dans ce depot.`);
      }
    }

    for (const item of order.items) {
      await tx.stock.update({
        where: { productId_storeId: { productId: item.productId, storeId: data.storeId } },
        data: { reserved: { increment: item.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          storeId: data.storeId,
          type: "RESERVATION",
          quantity: item.quantity,
          reference: order.reference,
          reason: "Reservation commande en ligne (depot assigne manuellement)",
          userId: user.id,
        },
      });
    }

    await tx.ecommerceOrder.update({ where: { id: orderId }, data: { storeId: data.storeId } });
    await tx.auditLog.create({
      data: { userId: user.id, action: "ASSIGN_STORE", entity: "EcommerceOrder", entityId: orderId },
    });
  });

  revalidatePath(`/erp/commandes-en-ligne/${orderId}`);
  revalidatePath("/erp/commandes-en-ligne");
}

export async function confirmEcommerceOrder(orderId: string) {
  const user = await requirePermission("ecommerceOrder.process");

  const order = await prisma.ecommerceOrder.findUnique({ where: { id: orderId } });
  if (!order || order.status !== "EN_ATTENTE") {
    throw new Error("Cette commande ne peut pas etre confirmee dans son etat actuel.");
  }
  if (!order.storeId) {
    throw new Error("Assignez d'abord un depot avant de confirmer la commande.");
  }

  await prisma.ecommerceOrder.update({ where: { id: orderId }, data: { status: "CONFIRMEE" } });
  await prisma.auditLog.create({
    data: { userId: user.id, action: "CONFIRM", entity: "EcommerceOrder", entityId: orderId },
  });

  revalidatePath(`/erp/commandes-en-ligne/${orderId}`);
  revalidatePath("/erp/commandes-en-ligne");
}

export async function startPreparationEcommerceOrder(orderId: string) {
  const user = await requirePermission("ecommerceOrder.process");

  await prisma.$transaction(async (tx) => {
    const order = await tx.ecommerceOrder.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order || order.status !== "CONFIRMEE" || !order.storeId) {
      throw new Error("Cette commande ne peut pas passer en preparation dans son etat actuel.");
    }

    for (const item of order.items) {
      await tx.stock.update({
        where: { productId_storeId: { productId: item.productId, storeId: order.storeId } },
        data: { quantity: { decrement: item.quantity }, reserved: { decrement: item.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          storeId: order.storeId,
          type: "SORTIE",
          quantity: -item.quantity,
          reference: order.reference,
          reason: "Preparation commande en ligne",
          userId: user.id,
        },
      });
      await checkLowStockAndNotify(tx, item.productId, order.storeId);
    }

    await tx.ecommerceOrder.update({ where: { id: orderId }, data: { status: "EN_PREPARATION" } });
    await tx.auditLog.create({
      data: { userId: user.id, action: "PREPARE", entity: "EcommerceOrder", entityId: orderId },
    });
  });

  revalidatePath(`/erp/commandes-en-ligne/${orderId}`);
  revalidatePath("/erp/commandes-en-ligne");
  revalidatePath("/erp/stock");
}

const deliverSchema = z.object({ paymentOption: z.string().min(1, "Mode de paiement obligatoire.") });

export async function markDeliveredEcommerceOrder(orderId: string, formData: FormData): Promise<void> {
  const user = await requirePermission("ecommerceOrder.process");
  const data = deliverSchema.parse({ paymentOption: formData.get("paymentOption") });

  await prisma.$transaction(async (tx) => {
    const order = await tx.ecommerceOrder.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order || order.status !== "EN_PREPARATION") {
      throw new Error("Cette commande ne peut pas etre marquee livree dans son etat actuel.");
    }

    const { method, cashSessionId } = parsePaymentOption(data.paymentOption);
    const invoiceReference = await generateReference("invoice", tx);
    const invoice = await tx.invoice.create({
      data: {
        reference: invoiceReference,
        storeId: order.storeId!,
        customerId: order.customerId,
        origin: "ECOMMERCE",
        ecommerceOrderId: order.id,
        sellerId: user.id,
        subtotal: order.subtotal,
        discount: 0,
        total: order.total,
        paidAmount: order.total,
        remainingAmount: 0,
        status: "PAYEE",
        items: {
          create: order.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            total: i.quantity * i.unitPrice,
          })),
        },
      },
    });

    const paymentReference = await generateReference("payment", tx);
    await tx.payment.create({
      data: {
        reference: paymentReference,
        invoiceId: invoice.id,
        amount: order.total,
        method,
        cashSessionId,
        userId: user.id,
      },
    });

    await tx.ecommerceOrder.update({ where: { id: orderId }, data: { status: "LIVREE" } });
    await tx.auditLog.create({
      data: { userId: user.id, action: "DELIVER", entity: "EcommerceOrder", entityId: orderId },
    });
  });

  revalidatePath(`/erp/commandes-en-ligne/${orderId}`);
  revalidatePath("/erp/commandes-en-ligne");
  revalidatePath("/erp/factures");
}

const cancelSchema = z.object({ reason: z.string().min(2, "Motif obligatoire.") });

export async function cancelEcommerceOrder(orderId: string, formData: FormData) {
  const user = await requirePermission("ecommerceOrder.process");
  const data = cancelSchema.parse({ reason: formData.get("reason") });

  await prisma.$transaction(async (tx) => {
    const order = await tx.ecommerceOrder.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order || order.status === "LIVREE" || order.status === "ANNULEE") {
      throw new Error("Cette commande ne peut pas etre annulee dans son etat actuel.");
    }

    if (order.storeId) {
      for (const item of order.items) {
        if (order.status === "EN_PREPARATION") {
          await tx.stock.update({
            where: { productId_storeId: { productId: item.productId, storeId: order.storeId } },
            data: { quantity: { increment: item.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              storeId: order.storeId,
              type: "RETOUR",
              quantity: item.quantity,
              reference: order.reference,
              reason: "Annulation commande en ligne",
              userId: user.id,
            },
          });
        } else {
          await tx.stock.update({
            where: { productId_storeId: { productId: item.productId, storeId: order.storeId } },
            data: { reserved: { decrement: item.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              storeId: order.storeId,
              type: "LIBERATION",
              quantity: item.quantity,
              reference: order.reference,
              reason: "Annulation commande en ligne",
              userId: user.id,
            },
          });
        }
      }
    }

    await tx.ecommerceOrder.update({
      where: { id: orderId },
      data: { status: "ANNULEE", cancelReason: data.reason },
    });
    await tx.auditLog.create({
      data: { userId: user.id, action: "CANCEL", entity: "EcommerceOrder", entityId: orderId },
    });
  });

  revalidatePath(`/erp/commandes-en-ligne/${orderId}`);
  revalidatePath("/erp/commandes-en-ligne");
  revalidatePath("/erp/stock");
}
