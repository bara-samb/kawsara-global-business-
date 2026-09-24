"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { markNotificationRead } from "@/lib/actions/notifications";

export function NotificationLink({
  href,
  notificationId,
  children,
  className,
}: {
  href: string;
  notificationId: string;
  children: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();

  function closeNotifications() {
    document.querySelectorAll("details").forEach((details) => {
      details.removeAttribute("open");
    });
  }

  async function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    closeNotifications();
    await markNotificationRead(notificationId);
    router.push(href);
  }

  return (
    <Link href={href} onClick={handleClick} className={className}>
      {children}
    </Link>
  );
}
