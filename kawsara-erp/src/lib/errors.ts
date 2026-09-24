import { z } from "zod";

// Messages de validation zod en francais (les messages personnalises des schemas restent prioritaires).
z.config(z.locales.fr());

/**
 * Erreur "metier" dont le message est ecrit pour l'utilisateur final et peut lui etre affiche tel quel.
 * Toute autre erreur (bug, base de donnees...) est remplacee par un message generique.
 */
export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserError";
  }
}

export type ActionResult = { error: string } | undefined;

export const GENERIC_ERROR_MESSAGE =
  "Une erreur inattendue est survenue. Reessayez ; si le probleme persiste, contactez l'administrateur.";

// Libelles lisibles des champs de formulaire, pour les erreurs de validation.
const FIELD_LABELS: Record<string, string> = {
  name: "Nom",
  email: "Email",
  password: "Mot de passe",
  phone: "Telephone",
  address: "Adresse",
  role: "Role",
  reason: "Motif",
  amount: "Montant",
  method: "Mode de paiement",
  paymentOption: "Mode de paiement",
  quantity: "Quantite",
  newQuantity: "Nouvelle quantite",
  productId: "Produit",
  storeId: "Boutique / depot",
  customerId: "Client",
  supplierId: "Fournisseur",
  categoryId: "Categorie",
  purchasePrice: "Prix d'achat",
  sellingPrice: "Prix de vente",
  minThreshold: "Seuil minimum",
  discount: "Remise",
  items: "Articles",
  code: "Code",
  openingBalance: "Fonds de caisse",
  closingBalance: "Montant compte en caisse",
  shippingAddress: "Adresse de livraison",
  shippingPhone: "Telephone de livraison",
  customerName: "Nom complet",
  customerEmail: "Email",
};

function humanizeZodError(error: z.ZodError): string {
  const messages = error.issues.slice(0, 3).map((issue) => {
    const field = issue.path.find((p): p is string => typeof p === "string");
    const label = field ? FIELD_LABELS[field] : undefined;
    return label ? `${label} : ${issue.message}` : issue.message;
  });
  return [...new Set(messages)].join(" ");
}

// Codes d'erreur Prisma les plus courants, sans importer @prisma/client (fichier partage).
const PRISMA_MESSAGES: Record<string, string> = {
  P2002: "Cet element existe deja (une valeur qui doit etre unique est deja utilisee).",
  P2003: "Operation impossible : cet element est lie a d'autres donnees.",
  P2025: "L'element demande est introuvable. Il a peut-etre ete supprime entre-temps.",
};

/** Transforme n'importe quelle erreur en message comprehensible par un humain. */
export function humanizeError(error: unknown): string {
  if (error instanceof UserError) return error.message;
  if (error instanceof Error && error.name === "ForbiddenError") return error.message;
  if (error instanceof z.ZodError) return humanizeZodError(error);
  if (error instanceof Error && error.name === "PrismaClientKnownRequestError") {
    const code = (error as Error & { code?: string }).code;
    if (code && PRISMA_MESSAGES[code]) return PRISMA_MESSAGES[code];
  }
  return GENERIC_ERROR_MESSAGE;
}
