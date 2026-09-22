import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/actions/notifications";

export default async function NotificationsPage() {
  const session = await auth();
  const notifications = await prisma.notification.findMany({
    where: { userId: session!.user.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-green-900">Notifications</h1>
          <p className="text-sm text-gray-500">{unreadCount} non lue(s) sur {notifications.length}</p>
        </div>
        {unreadCount > 0 && (
          <form action={markAllNotificationsRead}>
            <button className="rounded-md bg-brand-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-800">
              Tout marquer lu
            </button>
          </form>
        )}
      </div>

      <ul className="mt-6 space-y-2">
        {notifications.map((n) => (
          <li
            key={n.id}
            className={`flex items-start justify-between gap-3 rounded-xl border p-4 ${
              n.read ? "border-gray-200 bg-white" : "border-brand-green-200 bg-brand-green-50"
            }`}
          >
            <div>
              <p className="text-sm font-semibold text-brand-green-900">{n.title}</p>
              <p className="mt-1 text-sm text-gray-600">{n.message}</p>
              <p className="mt-2 text-xs text-gray-400">{n.createdAt.toLocaleString("fr-FR")}</p>
            </div>
            {!n.read && (
              <form action={markNotificationRead.bind(null, n.id)}>
                <button className="shrink-0 text-xs font-semibold text-brand-green-700 hover:underline">Marquer lu</button>
              </form>
            )}
          </li>
        ))}
        {notifications.length === 0 && (
          <li className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
            Aucune notification.
          </li>
        )}
      </ul>
    </div>
  );
}
