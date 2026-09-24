import "server-only";
import { unstable_rethrow } from "next/navigation";
import { humanizeError, type ActionResult } from "@/lib/errors";

/**
 * Execute le corps d'une Server Action et renvoie { error } avec un message lisible au lieu de
 * lever une exception : en production, Next.js masque le message des erreurs levees cote serveur,
 * l'utilisateur ne verrait sinon qu'un ecran d'erreur technique.
 * redirect() / notFound() continuent de fonctionner (unstable_rethrow les laisse passer).
 */
export async function runAction(fn: () => Promise<unknown>): Promise<ActionResult> {
  try {
    await fn();
  } catch (error) {
    unstable_rethrow(error);
    console.error("[action]", error);
    return { error: humanizeError(error) };
  }
}
