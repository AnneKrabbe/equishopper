"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import Header from "@/components/home/Header";
import { supabase } from "@/lib/supabase";
import {
  formatRelativeTime,
  getNotificationIcon,
  type NotificationRow,
} from "@/components/home/NotificationDropdown";

type Filter = "all" | "unread";

export default function NotificationsPage() {
  const router = useRouter();

  const [notifications, setNotifications] = useState<NotificationRow[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    void loadNotifications();
  }, []);

  async function loadNotifications() {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        router.push("/login?redirect=/notifikationer");
        return;
      }

      const { data, error } = await supabase
        .from("notifications")
        .select(`
          id,
          user_id,
          order_id,
          notification_type,
          title,
          message,
          href,
          read_at,
          created_at
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setNotifications((data ?? []) as NotificationRow[]);
    } catch (error) {
      console.error("Kunne ikke hente notifikationer:", error);
    } finally {
      setLoading(false);
    }
  }

  const unreadCount = useMemo(
    () =>
      notifications.filter((notification) => !notification.read_at)
        .length,
    [notifications],
  );

  const visibleNotifications = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter(
        (notification) => !notification.read_at,
      );
    }

    return notifications;
  }, [notifications, filter]);

  async function openNotification(notification: NotificationRow) {
    try {
      if (!notification.read_at) {
        const readAt = new Date().toISOString();

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          return;
        }

        const { error } = await supabase
          .from("notifications")
          .update({
            read_at: readAt,
          })
          .eq("id", notification.id)
          .eq("user_id", user.id);

        if (error) {
          throw error;
        }

        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id
              ? {
                  ...item,
                  read_at: readAt,
                }
              : item,
          ),
        );
      }
    } catch (error) {
      console.error(
        "Notifikationen kunne ikke markeres som læst:",
        error,
      );
    } finally {
      if (notification.href) {
        router.push(notification.href);
      }
    }
  }

  async function markAllRead() {
    if (markingAllRead || unreadCount === 0) {
      return;
    }

    try {
      setMarkingAllRead(true);

      const { error } = await supabase.rpc(
        "mark_all_notifications_read",
      );

      if (error) {
        throw error;
      }

      const readAt = new Date().toISOString();

      setNotifications((current) =>
        current.map((notification) =>
          notification.read_at
            ? notification
            : {
                ...notification,
                read_at: readAt,
              },
        ),
      );
    } catch (error) {
      console.error(
        "Notifikationerne kunne ikke markeres som læst:",
        error,
      );
    } finally {
      setMarkingAllRead(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f8f6f1]">
      <Header />

      <div className="mx-auto w-full max-w-3xl px-4 pb-20 pt-28 sm:px-6 md:pt-36">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-[#b79a3d]">
              Din konto
            </p>

            <h1 className="mt-2 font-serif text-4xl font-bold text-[#063f32] md:text-5xl">
              Notifikationer
            </h1>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => void markAllRead()}
              disabled={markingAllRead}
              className="self-start text-sm font-semibold text-[#0b5a47] transition hover:underline disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
            >
              {markingAllRead
                ? "Gemmer..."
                : "Markér alle som læst"}
            </button>
          )}
        </div>

        <div className="mt-8 flex gap-2 border-b border-stone-200">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${
              filter === "all"
                ? "border-[#063f32] text-[#063f32]"
                : "border-transparent text-stone-500 hover:text-[#063f32]"
            }`}
          >
            Alle
          </button>

          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${
              filter === "unread"
                ? "border-[#063f32] text-[#063f32]"
                : "border-transparent text-stone-500 hover:text-[#063f32]"
            }`}
          >
            Ulæste
            {unreadCount > 0 && (
              <span className="ml-2 rounded-full bg-[#063f32] px-2 py-0.5 text-[11px] text-white">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        <section className="mt-5 overflow-hidden rounded-[24px] border border-[#e7e1d7] bg-white shadow-sm">
          {loading ? (
            <div className="flex min-h-56 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-[#063f32]" />
            </div>
          ) : visibleNotifications.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-[#0b5a47]" />

              <h2 className="mt-4 font-serif text-2xl font-bold text-[#063f32]">
                {filter === "unread"
                  ? "Ingen ulæste notifikationer"
                  : "Ingen notifikationer endnu"}
              </h2>

              <p className="mt-2 text-sm text-stone-500">
                {filter === "unread"
                  ? "Du er helt opdateret."
                  : "Nye hændelser i dine handler vises her."}
              </p>
            </div>
          ) : (
            <div>
              {visibleNotifications.map((notification) => {
                const unread = !notification.read_at;
                const Icon = getNotificationIcon(
                  notification.notification_type,
                );

                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() =>
                      void openNotification(notification)
                    }
                    className={`relative flex w-full items-start gap-4 border-b border-stone-100 px-5 py-5 text-left transition last:border-b-0 hover:bg-stone-50 sm:px-6 ${
                      unread ? "bg-[#f3f8f5]" : "bg-white"
                    }`}
                  >
                    <span className="mt-0.5 flex h-12 w-12 flex-none items-center justify-center rounded-full bg-[#edf4ef] text-[#0b5a47]">
                      <Icon className="h-5 w-5" />
                    </span>

                    <span className="min-w-0 flex-1 pr-5">
                      <span
                        className={`block leading-6 ${
                          unread
                            ? "font-semibold text-[#063f32]"
                            : "font-medium text-stone-800"
                        }`}
                      >
                        {notification.title}
                      </span>

                      {notification.message && (
                        <span className="mt-1 block text-sm leading-6 text-stone-600">
                          {notification.message}
                        </span>
                      )}

                      <span className="mt-2 block text-sm font-semibold text-[#0b5a47]">
                        {formatRelativeTime(
                          notification.created_at,
                        )}
                      </span>
                    </span>

                    {unread && (
                      <span className="absolute right-5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-[#0b5a47]" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}