import Link from "next/link";
import { Bell, Check, CheckCheck, Inbox } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/actions/notifications";
import { getNotificationHref } from "@/lib/notification-links";
import { NotificationLink } from "@/components/erp/notification-link";

export async function NotificationsBell() {
  const session = await auth();
  if (!session?.user) return null;

  const [unreadCount, recent] = await Promise.all([
    prisma.notification.count({ where: { userId: session.user.id, read: false } }),
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return (
    <details className="relative">
      <summary className="flex list-none cursor-pointer items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-brand-green-900 transition hover:bg-brand-green-50 active:scale-95 [&::-webkit-details-marker]:hidden">
        <span className="relative flex items-center">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 h-2 w-2 animate-ping rounded-full bg-red-500" />
          )}
        </span>
        <span className="hidden sm:inline">Notifications</span>
        {unreadCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </summary>
      <div className="animate-scale-in absolute right-0 z-50 mt-2 w-80 origin-top-right rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-brand-green-900">Notifications</p>
          {unreadCount > 0 && (
            <form action={markAllNotificationsRead}>
              <button className="flex items-center gap-1 text-xs font-semibold text-brand-green-700 hover:underline">
                <CheckCheck className="h-3.5 w-3.5" />
                Tout marquer lu
              </button>
            </form>
          )}
        </div>
        <ul className="mt-2 max-h-80 space-y-1 overflow-y-auto">
          {recent.map((n) => (
            <li key={n.id} className={`rounded-md p-2 text-xs transition-colors ${n.read ? "bg-white text-gray-500" : "bg-brand-green-50 text-brand-green-900"}`}>
              <div className="flex items-start justify-between gap-2">
                <NotificationLink
                  href={getNotificationHref(n.type, n.entityId)}
                  notificationId={n.id}
                  className="min-w-0 flex-1 rounded-sm hover:underline"
                >
                  <p className="font-semibold">{n.title}</p>
                  <p className="mt-0.5">{n.message}</p>
                  <p className="mt-1 text-[10px] text-gray-400">{n.createdAt.toLocaleString("fr-FR")}</p>
                </NotificationLink>
                {!n.read && (
                  <form action={markNotificationRead.bind(null, n.id)}>
                    <button className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-brand-green-700 hover:underline">
                      <Check className="h-3 w-3" />
                      Lu
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
          {recent.length === 0 && (
            <li className="flex flex-col items-center gap-2 p-6 text-center text-xs text-gray-400">
              <Inbox className="h-6 w-6 text-gray-300" />
              Aucune notification.
            </li>
          )}
        </ul>
        <Link href="/erp/notifications" className="mt-2 block text-center text-xs font-semibold text-brand-green-700 hover:text-brand-gold-600">
          Voir toutes les notifications
        </Link>
      </div>
    </details>
  );
}
