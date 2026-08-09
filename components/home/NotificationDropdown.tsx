"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Package,
  Star,
  Truck,
  WalletCards,
} from "lucide-react";

export type NotificationRow = {
  id: string;
  user_id: string;
  order_id: string | null;
  notification_type: string;
  title: string;
  message: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

type NotificationDropdownProps = {
  notifications: NotificationRow[];
  loading: boolean;
  onNotificationClick: (notification: NotificationRow) => void;
  onMarkAllRead: () => void;
  markingAllRead: boolean;
  onClose: () => void;
};

export default function NotificationDropdown({
  notifications,
  loading,
  onNotificationClick,
  onMarkAllRead,
  markingAllRead,
  onClose,
}: NotificationDropdownProps) {
  const unreadCount = notifications.filter(
    (notification) => !notification.read_at,
  ).length;

  return (
    <div className="absolute right-0 top-full z-[10050] mt-3 w-[min(94vw,420px)] overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
        <div>
          <h2 className="font-serif text-xl font-bold text-[#063f32]">
            Notifikationer
          </h2>

          {unreadCount > 0 && (
            <p className="mt-0.5 text-xs text-stone-500">
              {unreadCount} ulæst{unreadCount === 1 ? "" : "e"}
            </p>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            disabled={markingAllRead}
            className="text-xs font-semibold text-[#0b5a47] transition hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            {markingAllRead ? "Gemmer..." : "Markér alle som læst"}
          </button>
        )}
      </div>

      <div className="max-h-[520px] overflow-y-auto">
        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-stone-500">
            Henter notifikationer...
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-[#0b5a47]" />
            <p className="mt-3 font-medium text-[#063f32]">
              Ingen notifikationer endnu
            </p>
          </div>
        ) : (
          <div>
            {notifications.map((notification) => {
              const unread = !notification.read_at;
              const Icon = getNotificationIcon(
                notification.notification_type,
              );

              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => onNotificationClick(notification)}
                  className={`relative flex w-full items-start gap-3 border-b border-stone-100 px-4 py-4 text-left transition last:border-b-0 hover:bg-stone-50 ${
                    unread ? "bg-[#f3f8f5]" : "bg-white"
                  }`}
                >
                  <span className="mt-0.5 flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[#edf4ef] text-[#0b5a47]">
                    <Icon className="h-5 w-5" />
                  </span>

                  <span className="min-w-0 flex-1 pr-4">
                    <span
                      className={`block text-sm leading-5 ${
                        unread
                          ? "font-semibold text-[#063f32]"
                          : "font-medium text-stone-800"
                      }`}
                    >
                      {notification.title}
                    </span>

                    {notification.message && (
                      <span className="mt-1 block text-sm leading-5 text-stone-600">
                        {notification.message}
                      </span>
                    )}

                    <span className="mt-1.5 block text-xs font-medium text-[#0b5a47]">
                      {formatRelativeTime(notification.created_at)}
                    </span>
                  </span>

                  {unread && (
                    <span className="absolute right-4 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-[#0b5a47]" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t border-stone-200 bg-white p-3">
        <Link
          href="/notifikationer"
          onClick={onClose}
          className="flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-[#0b5a47] transition hover:bg-stone-50"
        >
          Se alle notifikationer
        </Link>
      </div>
    </div>
  );
}

export function getNotificationIcon(type: string) {
  switch (type) {
    case "seller_action_required":
    case "order_paid":
      return Package;

    case "order_shipped":
    case "order_delivered":
      return Truck;

    case "order_completed":
      return CheckCircle2;

    case "payout_completed":
      return WalletCards;

    case "review_reminder":
      return Star;

    case "dispute_opened":
    case "dispute_updated":
    case "order_cancelled":
    case "refund_completed":
      return AlertTriangle;

    default:
      return CheckCircle2;
  }
}

export function formatRelativeTime(value: string) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60_000));

  if (diffMinutes < 1) return "Lige nu";
  if (diffMinutes < 60) return `${diffMinutes} min.`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} t.`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "I går";
  if (diffDays < 7) return `${diffDays} dage`;

  return new Intl.DateTimeFormat("da-DK", {
    day: "numeric",
    month: "short",
  }).format(date);
}