"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generateReference } from "@/lib/reference";
import { requirePermission, assertStoreAccess } from "@/lib/require-permission";
import { resolvePaymentOption } from "@/lib/payment-options";
import { notifyRoles, checkLowStockAndNotify } from "@/lib/notify";
import { auth } from "@/lib/auth";
import { hitRateLimit, currentRequestIp } from "@/lib/rate-limit";
import { UserError, humanizeError, type ActionResult } from "@/lib/errors";
import { runAction } from "@/lib/run-action";

// ---------- Boutique publique : passage de commande ----------

// Limites anti-abus : sans elles, un script pourrait reserver tout le stock avec de fausses commandes.
const MAX_QUANTITY_PER_LINE = 100;
const MAX_LINES_PER_ORDER = 50;
const MAX_PENDING_ORDERS_PER_PHONE = 3;
const ORDERS_PER_WINDOW = 5;
const ORDER_WINDOW_MS = 10 * 60 * 1000;

const checkoutItemSchema = z.object({
  productId: z.string().min(1).max(50),
  quantity: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_QUANTITY_PER_LINE, `${MAX_QUANTITY_PER_LINE} unites maximum par article en ligne. Contactez-nous pour une commande en gros.`),
});

const checkoutSchema = z.object({
  items: z
    .array(checkoutItemSchema)
    .min(1, "Le panier est vide.")
    .max(MAX_LINES_PER_ORDER, `${MAX_LINES_PER_ORDER} articles differents maximum par commande.`),
  customerName: z.string().trim().min(2, "Nom complet obligatoire.").max(120),
  customerEmail: z.string().trim().max(200).email("E-mail invalide.").optional().or(z.literal("")),
  shippingAddress: z.string().trim().min(3, "Adresse de livraison obligatoire.").max(500),
  shippingPhone: z.string().trim().min(6, "Telephone obligatoire.").max(30),
  notes: z.string().max(1000).optional(),
  paymentMethod: z.enum(["ESPECES", "WAVE", "ORANGE_MONEY", "VIREMENT", "CHEQUE"]),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export async function createEcommerceOrder(
  input: CheckoutInput
): Promise<{ id: string; reference: string } | { error: string }> {
  try {
    return await placeEcommerceOrder(input);
  } catch (error) {
    unstable_rethrow(error);
    console.error("[action]", error);
    return { error: humanizeError(error) };
  }
}

async function placeEcommerceOrder(input: CheckoutInput) {
  const session = await auth();
  const data = checkoutSchema.parse(input);
  const ipAddress = await currentRequestIp();

  // Limite de frequence : par compte pour un client connecte, par adresse IP sinon.
  const checkoutKey = `checkout:${session?.user.id ?? ipAddress}`;
  if (hitRateLimit(checkoutKey, ORDERS_PER_WINDOW, ORDER_WINDOW_MS)) {
    throw new UserError("Trop de commandes envoyees depuis votre connexion. Reessayez dans quelques minutes ou appelez-nous.");
  }

  // Verification de stock + choix du depot + reservation execute dans une seule transaction
  // pour eviter qu'une commande simultanee ne double-vende le meme stock (cahier des charges 39/51).
  const result = await prisma.$transaction(async (tx) => {
    // Plafond de commandes en attente par telephone : empeche de bloquer le stock en boucle.
    const pendingForPhone = await tx.ecommerceOrder.count({
      where: { shippingPhone: data.shippingPhone, status: "EN_ATTENTE" },
    });
    if (pendingForPhone >= MAX_PENDING_ORDERS_PER_PHONE) {
      throw new UserError(
        "Vous avez deja plusieurs commandes en attente de traitement. Attendez leur validation ou appelez-nous."
      );
    }

    // Auteur reel des mouvements de stock : le client connecte, ou personne (null) pour une
    // commande sans compte. Jamais un employe pris au hasard (le journal doit dire la verite).
    const actorUserId = session?.user.id ?? null;
    let customerId = session?.user.customerId ?? null;
    if (!customerId) {
      const reference = await generateReference("customer", tx);
      const customer = await tx.customer.create({
        data: {
          reference,
          name: data.customerName,
          email: data.customerEmail || null,
          phone: data.shippingPhone,
          userId: null,
        },
      });
      customerId = customer.id;
    } else {
      await tx.customer.update({
        where: { id: customerId },
        data: { name: data.customerName, email: data.customerEmail || undefined, phone: data.shippingPhone },
      });
    }

    const productIds = [...new Set(data.items.map((i) => i.productId))];
    const products = await tx.product.findMany({
      where: { id: { in: productIds }, active: true, onlineEnabled: true },
      include: { stocks: true },
    });
    if (products.length !== productIds.length) {
      throw new UserError("Un ou plusieurs produits ne sont plus disponibles a la vente en ligne.");
    }

    for (const item of data.items) {
      const product = products.find((p) => p.id === item.productId)!;
      const totalAvailable = product.stocks.reduce((s, st) => s + Math.max(0, st.quantity - st.reserved), 0);
      if (totalAvailable < item.quantity) {
        throw new UserError(`Stock insuffisant pour "${product.name}" (disponible : ${totalAvailable}).`);
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
            userId: actorUserId,
          },
        });
      }
    }

    await tx.auditLog.create({
      data: {
        userId: session?.user.id ?? null,
        action: "CREATE",
        entity: "EcommerceOrder",
        entityId: order.id,
        ipAddress,
        metadata: JSON.stringify({
          reference: order.reference,
          auteur: session?.user ? undefined : "Client sans compte",
          client: data.customerName,
          telephone: data.shippingPhone,
        }),
      },
    });

    await notifyRoles(
      ["ADMIN", "GERANT", "CAISSIER"],
      "NOUVELLE_COMMANDE",
      "Nouvelle commande en ligne",
      `Commande ${order.reference} — ${subtotal.toLocaleString("fr-FR")} FCFA.`,
      tx,
      order.id
    );

    return { id: order.id, reference: order.reference };
  });

  revalidatePath("/erp/commandes-en-ligne");
  return result;
}

// ---------- Espace gestion (ERP) : traitement des commandes en ligne ----------

const assignStoreSchema = z.object({ storeId: z.string().min(1, "Depot obligatoire.") });

export async function assignEcommerceOrderStore(orderId: string, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("ecommerceOrder.process");
    const data = assignStoreSchema.parse({ storeId: formData.get("storeId") });
    assertStoreAccess(user, data.storeId);

    await prisma.$transaction(async (tx) => {
      const order = await tx.ecommerceOrder.findUnique({ where: { id: orderId }, include: { items: true } });
      if (!order || order.storeId) throw new UserError("Cette commande a deja un depot assigne.");

      for (const item of order.items) {
        const stock = await tx.stock.findUnique({
          where: { productId_storeId: { productId: item.productId, storeId: data.storeId } },
        });
        const available = (stock?.quantity ?? 0) - (stock?.reserved ?? 0);
        if (available < item.quantity) {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          throw new UserError(`Stock insuffisant pour "${product?.name ?? item.productId}" dans ce depot.`);
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
  });
}

export async function confirmEcommerceOrder(orderId: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("ecommerceOrder.process");

    await prisma.$transaction(async (tx) => {
      const order = await tx.ecommerceOrder.findUnique({
        where: { id: orderId },
        include: { items: true, invoice: true, customer: true },
      });
      if (!order || order.status !== "EN_ATTENTE") {
        throw new UserError("Cette commande ne peut pas etre confirmee dans son etat actuel.");
      }
      if (!order.storeId) {
        throw new UserError("Assignez d'abord un depot avant de confirmer la commande.");
      }
      assertStoreAccess(user, order.storeId);

      // La validation transforme la commande en facture impayee. Le reglement
      // reste lie a la livraison, comme pour les autres commandes en ligne.
      if (!order.invoice) {
        const invoiceReference = await generateReference("invoice", tx);
        await tx.invoice.create({
          data: {
            reference: invoiceReference,
            storeId: order.storeId,
            customerId: order.customerId,
            customerName: order.customer.name,
            customerPhone: order.shippingPhone ?? order.customer.phone,
            origin: "ECOMMERCE",
            ecommerceOrderId: order.id,
            sellerId: user.id,
            subtotal: order.subtotal,
            discount: 0,
            total: order.total,
            remainingAmount: order.total,
            status: "IMPAYEE",
            items: {
              create: order.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.quantity * item.unitPrice,
              })),
            },
          },
        });
      }

      await tx.ecommerceOrder.update({ where: { id: orderId }, data: { status: "CONFIRMEE" } });
      await tx.auditLog.create({
        data: { userId: user.id, action: "CONFIRM", entity: "EcommerceOrder", entityId: orderId },
      });
    });

    revalidatePath(`/erp/commandes-en-ligne/${orderId}`);
    revalidatePath("/erp/commandes-en-ligne");
    revalidatePath("/erp/factures");
    revalidatePath(`/compte/commandes/${orderId}`);
  });
}

export async function startPreparationEcommerceOrder(orderId: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("ecommerceOrder.process");

    await prisma.$transaction(async (tx) => {
      const order = await tx.ecommerceOrder.findUnique({ where: { id: orderId }, include: { items: true } });
      if (!order || order.status !== "CONFIRMEE" || !order.storeId) {
        throw new UserError("Cette commande ne peut pas passer en preparation dans son etat actuel.");
      }
      assertStoreAccess(user, order.storeId);

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
  });
}

const deliverSchema = z.object({ paymentOption: z.string().min(1, "Mode de paiement obligatoire.") });

export async function markDeliveredEcommerceOrder(orderId: string, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("ecommerceOrder.process");
    const data = deliverSchema.parse({ paymentOption: formData.get("paymentOption") });

    await prisma.$transaction(async (tx) => {
      const order = await tx.ecommerceOrder.findUnique({
        where: { id: orderId },
        include: { items: true, invoice: true },
      });
      if (!order || order.status !== "EN_PREPARATION") {
        throw new UserError("Cette commande ne peut pas etre marquee livree dans son etat actuel.");
      }
      if (order.storeId) assertStoreAccess(user, order.storeId);
      if (!order.invoice) {
        throw new UserError("La commande doit etre validee avant d'etre livree.");
      }

      const { method, cashSessionId } = await resolvePaymentOption(tx, data.paymentOption, user);
      const invoice = order.invoice;
      if (invoice.remainingAmount <= 0) {
        throw new UserError("Cette facture est deja soldee.");
      }

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
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { paidAmount: invoice.total, remainingAmount: 0, status: "PAYEE" },
      });

      await tx.ecommerceOrder.update({ where: { id: orderId }, data: { status: "LIVREE" } });
      await tx.auditLog.create({
        data: { userId: user.id, action: "DELIVER", entity: "EcommerceOrder", entityId: orderId },
      });
    });

    revalidatePath(`/erp/commandes-en-ligne/${orderId}`);
    revalidatePath("/erp/commandes-en-ligne");
    revalidatePath("/erp/factures");
    revalidatePath(`/compte/commandes/${orderId}`);
  });
}

const cancelSchema = z.object({ reason: z.string().min(2, "Motif obligatoire.") });

export async function cancelEcommerceOrder(orderId: string, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("ecommerceOrder.cancel");
    const data = cancelSchema.parse({ reason: formData.get("reason") });

    await prisma.$transaction(async (tx) => {
      const order = await tx.ecommerceOrder.findUnique({ where: { id: orderId }, include: { items: true, invoice: true } });
      if (!order || order.status === "LIVREE" || order.status === "ANNULEE") {
        throw new UserError("Cette commande ne peut pas etre annulee dans son etat actuel.");
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
      if (order.invoice && order.invoice.status !== "ANNULEE") {
        await tx.invoice.update({
          where: { id: order.invoice.id },
          data: {
            status: "ANNULEE",
            cancelReason: data.reason,
            cancelledById: user.id,
            cancelledAt: new Date(),
          },
        });
      }
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "CANCEL",
          entity: "EcommerceOrder",
          entityId: orderId,
          metadata: JSON.stringify({ reference: order.reference, previousStatus: order.status, reason: data.reason }),
        },
      });
    });

    revalidatePath(`/erp/commandes-en-ligne/${orderId}`);
    revalidatePath("/erp/commandes-en-ligne");
    revalidatePath("/erp/stock");
  });
}

export async function cancelCustomerEcommerceOrder(orderId: string): Promise<ActionResult> {
  return runAction(async () => {
    const session = await auth();
    const customerId = session?.user.customerId;
    if (!session?.user || session.user.role !== "CLIENT" || !customerId) {
      throw new UserError("Vous devez etre connecte en tant que client.");
    }

    const reason = "Annulation par le client";
    await prisma.$transaction(async (tx) => {
      const order = await tx.ecommerceOrder.findUnique({
        where: { id: orderId },
        include: { items: true, invoice: true },
      });
      if (!order || order.customerId !== customerId) {
        throw new UserError("Commande introuvable.");
      }
      if (order.status === "LIVREE" || order.status === "ANNULEE") {
        throw new UserError("Cette commande ne peut plus etre annulee.");
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
                reason: "Annulation commande en ligne par le client",
                userId: session.user.id,
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
                reason: "Annulation commande en ligne par le client",
                userId: session.user.id,
              },
            });
          }
        }
      }

      await tx.ecommerceOrder.update({
        where: { id: orderId },
        data: { status: "ANNULEE", cancelReason: reason },
      });
      if (order.invoice && order.invoice.status !== "ANNULEE") {
        await tx.invoice.update({
          where: { id: order.invoice.id },
          data: {
            status: "ANNULEE",
            cancelReason: reason,
            cancelledById: session.user.id,
            cancelledAt: new Date(),
          },
        });
      }
      await tx.auditLog.create({
        data: { userId: session.user.id, action: "CANCEL", entity: "EcommerceOrder", entityId: order.id },
      });
    });

    revalidatePath(`/compte/commandes/${orderId}`);
    revalidatePath("/compte/commandes");
    revalidatePath("/compte/factures");
    revalidatePath("/erp/commandes-en-ligne");
    revalidatePath("/erp/stock");
  });
}
