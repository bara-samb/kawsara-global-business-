"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/lib/errors";
import { runAction } from "@/lib/run-action";

export async function markNotificationRead(notificationId: string): Promise<ActionResult> {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user) return;

    // Un utilisateur ne peut marquer comme lues que ses propres notifications.
    await prisma.notification.updateMany({
      where: { id: notificationId, userId: session.user.id },
      data: { read: true },
    });
    revalidatePath("/erp/notifications");
  });
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user) return;

    await prisma.notification.updateMany({
      where: { userId: session.user.id, read: false },
      data: { read: true },
    });
    revalidatePath("/erp/notifications");
  });
}
