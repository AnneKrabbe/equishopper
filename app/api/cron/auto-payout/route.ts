import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

import {
  sendPaymentReleasedBuyerEmail,
  sendPaymentReleasedSellerEmail,
  sendReviewReminderEmail,
} from "@/lib/email/email-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    throw new Error("CRON_SECRET mangler.");
  }

  return req.headers.get("authorization") === `Bearer ${secret}`;
}

function formatDkk(amountInOre: number) {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "DKK",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountInOre / 100);
}

async function getAuthEmail(userId: string) {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);

  if (error) {
    throw new Error(`Kunne ikke hente brugerens e-mail: ${error.message}`);
  }

  return data.user?.email ?? null;
}

async function ensureReviewNotification(orderId: string) {
  try {
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, buyer_id")
      .eq("id", orderId)
      .single();

    if (orderError) {
      throw orderError;
    }

    const { data: existingNotification, error: lookupError } =
      await supabaseAdmin
        .from("notifications")
        .select("id")
        .eq("user_id", order.buyer_id)
        .eq("order_id", order.id)
        .eq("notification_type", "order_completed")
        .eq("title", "Hvordan gik handlen?")
        .maybeSingle();

    if (lookupError) {
      throw lookupError;
    }

    if (existingNotification) {
      return;
    }

    const { error: insertError } = await supabaseAdmin
      .from("notifications")
      .insert({
        user_id: order.buyer_id,
        order_id: order.id,
        notification_type: "order_completed",
        title: "Hvordan gik handlen?",
        message:
          "Din handel er gennemført. Skriv en anmeldelse af sælgeren.",
        href: "/mine-ordrer",
      });

    if (insertError) {
      throw insertError;
    }
  } catch (error) {
    console.error(
      `[auto-payout] Anmeldelsesnotifikation kunne ikke oprettes for ordre ${orderId}:`,
      error,
    );
  }
}

async function ensureReviewReminderEmail(orderId: string) {
  try {
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, buyer_id, seller_id")
      .eq("id", orderId)
      .single();

    if (orderError) {
      throw orderError;
    }

    const { data: reminderState, error: reminderStateError } =
      await supabaseAdmin
        .from("orders")
        .select("review_reminder_sent_at")
        .eq("id", order.id)
        .maybeSingle();

    if (reminderStateError) {
      throw reminderStateError;
    }

    if (reminderState?.review_reminder_sent_at) {
      return;
    }

    const [buyerAuthResult, buyerProfileResult, sellerProfileResult, itemResult] =
      await Promise.all([
        supabaseAdmin.auth.admin.getUserById(order.buyer_id),
        supabaseAdmin
          .from("profiles")
          .select("full_name")
          .eq("id", order.buyer_id)
          .maybeSingle(),
        supabaseAdmin
          .from("profiles")
          .select("full_name, username")
          .eq("id", order.seller_id)
          .maybeSingle(),
        supabaseAdmin
          .from("order_items")
          .select("listing_id, title_snapshot")
          .eq("order_id", order.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);

    if (buyerAuthResult.error) {
      throw buyerAuthResult.error;
    }

    if (buyerProfileResult.error) {
      console.error(
        `[auto-payout] Kunne ikke hente køberprofil til anmeldelsesmail for ordre ${orderId}:`,
        buyerProfileResult.error,
      );
    }

    if (sellerProfileResult.error) {
      console.error(
        `[auto-payout] Kunne ikke hente sælgerprofil til anmeldelsesmail for ordre ${orderId}:`,
        sellerProfileResult.error,
      );
    }

    if (itemResult.error) {
      throw itemResult.error;
    }

    const buyerEmail = buyerAuthResult.data.user?.email ?? null;

    if (!buyerEmail) {
      console.warn(
        `[auto-payout] Anmeldelsesmail blev ikke sendt: køber mangler e-mail. Ordre ${orderId}.`,
      );
      return;
    }

    const item = itemResult.data;
    const listingTitle = item?.title_snapshot?.trim() || "din handel";

    let listingImageUrl: string | null = null;

    if (item?.listing_id) {
      const { data: listingImage, error: listingImageError } =
        await supabaseAdmin
          .from("listing_images")
          .select("image_url")
          .eq("listing_id", item.listing_id)
          .order("sort_order", { ascending: true })
          .limit(1)
          .maybeSingle();

      if (listingImageError) {
        console.error(
          `[auto-payout] Kunne ikke hente varebillede til anmeldelsesmail for ordre ${orderId}:`,
          listingImageError,
        );
      } else {
        listingImageUrl =
          typeof listingImage?.image_url === "string"
            ? listingImage.image_url
            : null;
      }
    }

    const otherPartyName =
      sellerProfileResult.data?.full_name?.trim() ||
      sellerProfileResult.data?.username?.trim() ||
      "sælgeren";

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://www.equishopper.dk";

    const reviewUrl = `${siteUrl.replace(/\/$/, "")}/mine-ordrer`;

    await sendReviewReminderEmail({
      to: {
        email: buyerEmail,
        name: buyerProfileResult.data?.full_name ?? null,
      },
      props: {
        recipientName: buyerProfileResult.data?.full_name ?? null,
        otherPartyName,
        listingTitle,
        listingImageUrl,
        transactionRole: "buyer",
        reviewUrl,
      },
    });

    const { error: markerUpdateError } = await supabaseAdmin
      .from("orders")
      .update({
        review_reminder_sent_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .is("review_reminder_sent_at", null);

    if (markerUpdateError) {
      console.error(
        `[auto-payout] Anmeldelsesmail blev sendt, men mail-markøren kunne ikke gemmes for ordre ${orderId}:`,
        markerUpdateError,
      );
    }
  } catch (error) {
    // Review-mail må aldrig gøre en allerede gennemført payout til en payout-fejl.
    console.error(
      `[auto-payout] Kunne ikke sende anmeldelsesmail for ordre ${orderId}:`,
      error,
    );
  }
}

async function sendPayoutEmails(orderId: string) {
  try {
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select(
        "id, buyer_id, seller_id, seller_payout_amount, payout_net_amount",
      )
      .eq("id", orderId)
      .single();

    if (orderError) {
      throw new Error(`Kunne ikke hente ordren: ${orderError.message}`);
    }

    const { data: items, error: itemsError } = await supabaseAdmin
      .from("order_items")
      .select("title_snapshot, unit_price, quantity")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    if (itemsError) {
      throw new Error(`Kunne ikke hente ordrelinjer: ${itemsError.message}`);
    }

    const firstItem = items?.[0];

    if (!firstItem) {
      throw new Error("Ordren har ingen ordrelinjer.");
    }

    const listingTitle =
      items && items.length > 1
        ? `${firstItem.title_snapshot} + ${items.length - 1} mere`
        : firstItem.title_snapshot;

    const unitPriceDkk = Number(firstItem.unit_price ?? 0);
    const quantity = Number(firstItem.quantity ?? 1);
    const salePrice = new Intl.NumberFormat("da-DK", {
      style: "currency",
      currency: "DKK",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(unitPriceDkk * quantity);

    const payoutAmountInOre = Number(
      order.payout_net_amount ?? order.seller_payout_amount ?? 0,
    );

    const [profilesResult, buyerEmail, sellerEmail] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, full_name")
        .in("id", [order.buyer_id, order.seller_id]),
      getAuthEmail(order.buyer_id),
      getAuthEmail(order.seller_id),
    ]);

    if (profilesResult.error) {
      throw new Error(
        `Kunne ikke hente køber/sælger-profiler: ${profilesResult.error.message}`,
      );
    }

    const buyerProfile = profilesResult.data?.find(
      (profile) => profile.id === order.buyer_id,
    );
    const sellerProfile = profilesResult.data?.find(
      (profile) => profile.id === order.seller_id,
    );

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://www.equishopper.dk";

    const orderUrl = `${siteUrl.replace(/\/$/, "")}/mine-ordrer`;

    const jobs: Promise<unknown>[] = [];

    if (sellerEmail) {
      jobs.push(
        sendPaymentReleasedSellerEmail({
          to: {
            email: sellerEmail,
            name: sellerProfile?.full_name ?? null,
          },
          props: {
            sellerName: sellerProfile?.full_name ?? null,
            listingTitle,
            salePrice,
            payoutAmount: formatDkk(payoutAmountInOre),
            orderUrl,
          },
        }),
      );
    } else {
      console.error(
        `[auto-payout] Sælger ${order.seller_id} har ingen e-mail. Ordre ${orderId}.`,
      );
    }

    if (buyerEmail) {
      jobs.push(
        sendPaymentReleasedBuyerEmail({
          to: {
            email: buyerEmail,
            name: buyerProfile?.full_name ?? null,
          },
          props: {
            buyerName: buyerProfile?.full_name ?? null,
            listingTitle,
            salePrice,
            orderUrl,
          },
        }),
      );
    } else {
      console.error(
        `[auto-payout] Køber ${order.buyer_id} har ingen e-mail. Ordre ${orderId}.`,
      );
    }

    const settled = await Promise.allSettled(jobs);

    for (const result of settled) {
      if (result.status === "rejected") {
        console.error(
          `[auto-payout] Payout-mail kunne ikke sendes for ordre ${orderId}:`,
          result.reason,
        );
      }
    }
  } catch (error) {
    // Mail må aldrig gøre en allerede gennemført payout til en payout-fejl.
    console.error(
      `[auto-payout] Kunne ikke sende payout-mails for ordre ${orderId}:`,
      error,
    );
  }
}

async function runPostPayoutNotifications(orderId: string) {
  await ensureReviewNotification(orderId);
  await ensureReviewReminderEmail(orderId);
  await sendPayoutEmails(orderId);
}

async function payout(id: string) {
  const { data: order, error } = await supabaseAdmin.rpc(
    "prepare_order_auto_payout",
    {
      p_order_id: id,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  if (order.payout_status === "paid" || order.stripe_transfer_id) {
    return { id, result: "already_paid" };
  }

  const amount = Number(order.payout_net_amount);

  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error("Ugyldigt payout_net_amount.");
  }

  if (amount === 0) {
    const { error: finalizeError } = await supabaseAdmin.rpc(
      "finalize_order_auto_without_transfer",
      {
        p_order_id: id,
      },
    );

    if (finalizeError) {
      throw new Error(finalizeError.message);
    }

    await runPostPayoutNotifications(id);

    return {
      id,
      result: "completed_without_transfer",
    };
  }

  if (!order.seller_stripe_account_id) {
    throw new Error("Ordren mangler sælgerens Stripe-konto.");
  }

  if (!order.stripe_charge_id) {
    throw new Error("Ordren mangler Stripe charge-id.");
  }

  const transfer = await stripe.transfers.create(
    {
      amount,
      currency: (order.currency || "dkk").toLowerCase(),
      destination: order.seller_stripe_account_id,
      source_transaction: order.stripe_charge_id,
      transfer_group: `ORDER_${id}`,
      metadata: {
        order_id: id,
        payout_type: "automatic_delivery",
      },
      description: `Equishopper auto-udbetaling for ordre ${id}`,
    },
    {
      idempotencyKey: `equishopper-order-payout-${id}`,
    },
  );

  const { error: finalizeError } = await supabaseAdmin.rpc(
    "finalize_order_auto_after_transfer",
    {
      p_order_id: id,
      p_transfer_id: transfer.id,
    },
  );

  if (finalizeError) {
    throw new Error(finalizeError.message);
  }

  await runPostPayoutNotifications(id);

  return {
    id,
    result: "paid",
    transferId: transfer.id,
  };
}

export async function GET(req: NextRequest) {
  try {
    if (!authorized(req)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("payment_status", "paid")
      .not("shipping_delivered_at", "is", null)
      .not("payout_due_at", "is", null)
      .lte("payout_due_at", new Date().toISOString())
      .neq("payout_status", "paid")
      .order("payout_due_at", {
        ascending: true,
      })
      .limit(25);

    if (error) {
      throw new Error(error.message);
    }

    const results = [];

    for (const row of data ?? []) {
      try {
        results.push(await payout(row.id));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Ukendt fejl";

        await supabaseAdmin
          .from("orders")
          .update({
            payout_error: message.slice(0, 2000),
          })
          .eq("id", row.id);

        results.push({
          id: row.id,
          result: "error",
          error: message,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      checked: data?.length ?? 0,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Ukendt fejl",
      },
      {
        status: 500,
      },
    );
  }
}
