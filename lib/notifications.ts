import { supabaseAdmin } from "@/lib/supabase-admin";

export type NotificationType =
  | "order_paid"
  | "seller_action_required"
  | "order_shipped"
  | "order_ready_for_pickup"
  | "order_delivered"
  | "buyer_confirmation_required"
  | "order_completed"
  | "payout_completed"
  | "order_cancelled"
  | "dispute_opened"
  | "dispute_updated"
  | "refund_completed"
  | "review_reminder"
  | "system";

type CreateNotificationInput = {
  userId: string;
  notificationType: NotificationType;
  title: string;
  message?: string | null;
  href?: string | null;
  orderId?: string | null;
};

export async function createNotification({
  userId,
  notificationType,
  title,
  message = null,
  href = null,
  orderId = null,
}: CreateNotificationInput) {
  const cleanTitle = title.trim();
  const cleanMessage = message?.trim() || null;
  const cleanHref = href?.trim() || null;

  if (!userId) {
    throw new Error("Notifikationen mangler userId.");
  }

  if (!cleanTitle) {
    throw new Error("Notifikationen mangler titel.");
  }

  if (cleanHref && !cleanHref.startsWith("/")) {
    throw new Error(
      "Notifikationslinks skal være interne links, der starter med /.",
    );
  }

  const { data, error } = await supabaseAdmin
    .from("notifications")
    .insert({
      user_id: userId,
      order_id: orderId,
      notification_type: notificationType,
      title: cleanTitle,
      message: cleanMessage,
      href: cleanHref,
    })
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
    .single();

  if (error) {
    console.error("Kunne ikke oprette notifikation:", {
      userId,
      notificationType,
      orderId,
      error,
    });

    throw new Error(
      `Notifikationen kunne ikke oprettes: ${error.message}`,
    );
  }

  return data;
}

export async function createNotifications(
  notifications: CreateNotificationInput[],
) {
  if (notifications.length === 0) {
    return [];
  }

  const rows = notifications.map((notification) => {
    const title = notification.title.trim();
    const message = notification.message?.trim() || null;
    const href = notification.href?.trim() || null;

    if (!notification.userId) {
      throw new Error("En notifikation mangler userId.");
    }

    if (!title) {
      throw new Error("En notifikation mangler titel.");
    }

    if (href && !href.startsWith("/")) {
      throw new Error(
        "Notifikationslinks skal være interne links, der starter med /.",
      );
    }

    return {
      user_id: notification.userId,
      order_id: notification.orderId ?? null,
      notification_type: notification.notificationType,
      title,
      message,
      href,
    };
  });

  const { data, error } = await supabaseAdmin
    .from("notifications")
    .insert(rows)
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
    `);

  if (error) {
    console.error("Kunne ikke oprette notifikationer:", error);

    throw new Error(
      `Notifikationerne kunne ikke oprettes: ${error.message}`,
    );
  }

  return data ?? [];
}