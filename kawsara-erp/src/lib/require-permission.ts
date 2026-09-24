import "server-only";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { can, isPrincipalAdminOnly, ForbiddenError } from "@/lib/permissions";
import { UserError } from "@/lib/errors";

/**
 * A appeler en premiere ligne de chaque Server Action / route API sensible.
 * Le frontend ne doit jamais etre la seule barriere (section 6 du cahier des charges).
 */
export async function requirePermission(permission: string) {
  const session = await auth();
  if (!session?.user) {
    throw new ForbiddenError(permission);
  }

  // Actions dangereuses : le statut d'admin principal est relu en base a chaque appel,
  // jamais depuis le jeton de session (qui peut etre anterieur a un changement de droits).
  let isPrincipalAdmin = false;
  if (isPrincipalAdminOnly(permission)) {
    const record = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isPrincipalAdmin: true, active: true, role: true },
    });
    isPrincipalAdmin = !!record?.active && record.role === "ADMIN" && record.isPrincipalAdmin;
  }

  if (!can(session.user.role, permission, isPrincipalAdmin)) {
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "ACCESS_DENIED",
        entity: permission,
        metadata: isPrincipalAdminOnly(permission) ? "Action reservee a l'admin principal" : null,
      },
    });
    throw new ForbiddenError(permission);
  }
  return session.user;
}

/**
 * Equivalent de requirePermission pour les PAGES (Server Components) : masquer un lien du menu
 * ne suffit pas, un utilisateur peut taper l'URL. En cas de refus, l'acces est journalise et
 * l'utilisateur est redirige vers une page d'explication au lieu de voir les donnees.
 */
export async function requirePagePermission(permission: string) {
  try {
    return await requirePermission(permission);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      redirect(`/erp/acces-refuse?permission=${encodeURIComponent(permission)}`);
    }
    throw error;
  }
}

/**
 * Cloisonnement par boutique : un employe rattache a une boutique (storeId) ne peut agir que
 * sur celle-ci. Les comptes sans boutique (siege : admin, gerant general) agissent partout.
 */
export function assertStoreAccess(user: { storeId: string | null }, storeId: string) {
  if (user.storeId && user.storeId !== storeId) {
    throw new UserError("Acces refuse : vous ne pouvez agir que sur votre propre boutique.");
  }
}
