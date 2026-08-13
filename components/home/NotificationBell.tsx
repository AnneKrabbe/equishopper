"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel, User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import NotificationDropdown, {
  type NotificationRow,
} from "@/components/home/NotificationDropdown";

type NotificationBellProps = {
  user: User | null;
};

export default function NotificationBell({
  user,
}: NotificationBellProps) {
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<
    NotificationRow[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const unreadCount = notifications.filter(
    (notification) => !notification.read_at,
  ).length;

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setOpen(false);

      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      return;
    }

    void loadNotifications();

    /*
     * Realtime:
     * Nye notifikationer kommer direkte ind i klokken,
     * når Supabase opretter dem.
     */
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification =
            payload.new as NotificationRow;

          setNotifications((current) => {
            /*
             * Undgå dubletter, hvis både Realtime og
             * fallback-opdateringen rammer samtidig.
             */
            if (
              current.some(
                (item) => item.id === newNotification.id,
              )
            ) {
              return current;
            }

            return [
              newNotification,
              ...current,
            ].slice(0, 8);
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updatedNotification =
            payload.new as NotificationRow;

          setNotifications((current) =>
            current.map((item) =>
              item.id === updatedNotification.id
                ? updatedNotification
                : item,
            ),
          );
        },
      )
      .subscribe();

    channelRef.current = channel;

    /*
     * Fallback:
     * Hvis Realtime af en eller anden grund ikke leverer,
     * henter vi stadig nye notifikationer hvert 10. sekund.
     */
    const interval = window.setInterval(() => {
      void loadNotifications({ silent: true });
    }, 10_000);

    return () => {
      window.clearInterval(interval);

      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick,
    );
    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick,
      );
      document.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, []);

  async function loadNotifications(options?: {
    silent?: boolean;
  }) {
    if (!user) return;

    try {
      if (!options?.silent) {
        setLoading(true);
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
        .order("created_at", { ascending: false })
        .limit(8);

      if (error) {
        throw error;
      }

      setNotifications(
        (data ?? []) as NotificationRow[],
      );
    } catch (error) {
      console.error(
        "Kunne ikke hente notifikationer:",
        error,
      );
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }

  async function handleNotificationClick(
    notification: NotificationRow,
  ) {
    try {
      if (!notification.read_at) {
        const readAt = new Date().toISOString();

        const { error } = await supabase
          .from("notifications")
          .update({
            read_at: readAt,
          })
          .eq("id", notification.id)
          .eq("user_id", user?.id ?? "");

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
      setOpen(false);

      if (notification.href) {
        router.push(notification.href);
      }
    }
  }

  async function handleMarkAllRead() {
    if (
      !user ||
      markingAllRead ||
      unreadCount === 0
    ) {
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

  if (!user) {
    return null;
  }

  return (
    <div
      ref={wrapperRef}
      className="relative"
    >
      <button
        type="button"
        aria-label={
          unreadCount > 0
            ? `Notifikationer, ${unreadCount} ulæste`
            : "Notifikationer"
        }
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => !current);

          if (!open) {
            void loadNotifications();
          }
        }}
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[#d4af37] text-[#d4af37] transition hover:bg-[#d4af37]/10"
      >
        <Bell className="h-5 w-5 fill-current" />

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-[#063f32]">
            {unreadCount > 9
              ? "9+"
              : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <NotificationDropdown
          notifications={notifications}
          loading={loading}
          onNotificationClick={
            handleNotificationClick
          }
          onMarkAllRead={handleMarkAllRead}
          markingAllRead={markingAllRead}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}