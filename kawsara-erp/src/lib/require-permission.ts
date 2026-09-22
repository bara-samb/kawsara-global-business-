import "server-only";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can, ForbiddenError } from "@/lib/permissions";

/**
 * A appeler en premiere ligne de chaque Server Action / route API sensible.
 * Le frontend ne doit jamais etre la seule barriere (section 6 du cahier des charges).
 */
export async function requirePermission(permission: string) {
  const session = await auth();
  if (!session?.user) {
    throw new ForbiddenError(permission);
  }
  if (!can(session.user.role, permission)) {
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "ACCESS_DENIED",
        entity: permission,
      },
    });
    throw new ForbiddenError(permission);
  }
  return session.user;
}
