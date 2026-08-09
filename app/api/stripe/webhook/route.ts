import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import {
  sendItemSoldEmail,
  sendOrderConfirmationEmail,
} from "@/lib/email/email-service";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://equishopper.dk";

type PaidOrderRow = {
  id: string;
  buyer_id: string;
  seller_id: string;
  subtotal: number | string | null;
  shipping_price: number | string | null;
  total: number | string | null;
  currency: string | null;
};

type OrderItemRow = {
  listing_id: string;
  title_snapshot: string;
  unit_price: number | string;
  quantity: number;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
};

type ListingImageRow = {
  listing_id: string;
  image_url: string;
  sort_order: number | null;
};

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Webhook-konfiguration mangler." },
      { status: 400 },
    );
  }

  let event: Stripe.Event;

  try {
    const rawBody = await request.text();

    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );
  } catch (error) {
    console.error("Ugyldig Stripe-signatur:", error);

    return NextResponse.json(
      { error: "Ugyldig webhook-signatur." },
      { status: 400 },
    );
  }

  const { data: existingEvent, error: existingEventError } =
    await supabaseAdmin
      .from("stripe_webhook_events")
      .select("stripe_event_id")
      .eq("stripe_event_id", event.id)
      .maybeSingle();

  if (existingEventError) {
    console.error(
      "Kunne ikke kontrollere eksisterende webhook-event:",
      existingEventError,
    );

    return NextResponse.json(
      { error: "Webhook-event kunne ikke kontrolleres." },
      { status: 500 },
    );
  }

  if (existingEvent) {
    return NextResponse.json({ received: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await handleCheckoutPaid(
          event.data.object as Stripe.Checkout.Session,
        );
        break;

      case "checkout.session.expired":
      case "checkout.session.async_payment_failed":
        await handleCheckoutExpired(
          event.data.object as Stripe.Checkout.Session,
        );
        break;

      default:
        break;
    }

    const { error: eventInsertError } = await supabaseAdmin
      .from("stripe_webhook_events")
      .insert({
        stripe_event_id: event.id,
        event_type: event.type,
      });

    if (
      eventInsertError &&
      eventInsertError.code !== "23505"
    ) {
      throw eventInsertError;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(
      `Webhook ${event.type} fejlede:`,
      error,
    );

    return NextResponse.json(
      { error: "Webhooken kunne ikke behandles." },
      { status: 500 },
    );
  }
}

async function handleCheckoutPaid(
  session: Stripe.Checkout.Session,
) {
  const orderId =
    session.metadata?.order_id ||
    session.client_reference_id;

  if (!orderId) {
    throw new Error(
      "Stripe-sessionen mangler order_id.",
    );
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id || null;

  let chargeId: string | null = null;

  if (paymentIntentId) {
    const paymentIntent =
      await stripe.paymentIntents.retrieve(
        paymentIntentId,
      );

    chargeId =
      typeof paymentIntent.latest_charge === "string"
        ? paymentIntent.latest_charge
        : paymentIntent.latest_charge?.id || null;
  }

  const {
    data: updatedOrder,
    error: updateError,
  } = await supabaseAdmin
    .from("orders")
    .update({
      status: "paid",
      payment_status: "paid",
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id:
        paymentIntentId,
      stripe_charge_id: chargeId,
      paid_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("payment_status", "unpaid")
    .select(`
      id,
      buyer_id,
      seller_id,
      subtotal,
      shipping_price,
      total,
      currency
    `)
    .maybeSingle();

  if (updateError) {
    console.error(
      "Kunne ikke markere ordre som betalt:",
      {
        orderId,
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
      },
    );

    throw updateError;
  }

  if (!updatedOrder) {
    return;
  }

  const order = updatedOrder as PaidOrderRow;

  try {
    await sendPaidOrderEmails(order);
  } catch (emailError) {
    console.error(
      "Ordren blev betalt, men e-mails kunne ikke sendes:",
      {
        orderId: order.id,
        error: emailError,
      },
    );
  }
}

async function sendPaidOrderEmails(
  order: PaidOrderRow,
) {
  const { data: itemsData, error: itemsError } =
    await supabaseAdmin
      .from("order_items")
      .select(`
        listing_id,
        title_snapshot,
        unit_price,
        quantity
      `)
      .eq("order_id", order.id)
      .order("created_at", { ascending: true });

  if (itemsError) {
    throw new Error(
      `Order items kunne ikke hentes til e-mail: ${itemsError.message}`,
    );
  }

  const items = (itemsData ?? []) as OrderItemRow[];

  if (items.length === 0) {
    throw new Error(
      "Ordren har ingen order_items til e-mail.",
    );
  }

  const primaryItem = items[0];
  const listingIds = Array.from(
    new Set(
      items
        .map((item) => item.listing_id)
        .filter(Boolean),
    ),
  );

  let listingImageUrl: string | null = null;

  if (listingIds.length > 0) {
    const {
      data: imageData,
      error: imageError,
    } = await supabaseAdmin
      .from("listing_images")
      .select(`
        listing_id,
        image_url,
        sort_order
      `)
      .in("listing_id", listingIds)
      .order("sort_order", {
        ascending: true,
      });

    if (imageError) {
      console.error(
        "Kunne ikke hente annoncebillede til e-mail:",
        imageError,
      );
    } else {
      const imageRows =
        (imageData ?? []) as ListingImageRow[];

      listingImageUrl =
        imageRows.find(
          (image) =>
            image.listing_id ===
            primaryItem.listing_id,
        )?.image_url ?? null;
    }
  }

  const {
    data: profileData,
    error: profilesError,
  } = await supabaseAdmin
    .from("profiles")
    .select(`
      id,
      full_name,
      username
    `)
    .in("id", [
      order.buyer_id,
      order.seller_id,
    ]);

  if (profilesError) {
    throw new Error(
      `Profiler kunne ikke hentes til e-mail: ${profilesError.message}`,
    );
  }

  const profiles = (profileData ?? []) as ProfileRow[];

  const buyerProfile =
    profiles.find(
      (profile) =>
        profile.id === order.buyer_id,
    ) ?? null;

  const sellerProfile =
    profiles.find(
      (profile) =>
        profile.id === order.seller_id,
    ) ?? null;

  const buyerName =
    getDisplayName(buyerProfile);

  const sellerName =
    getDisplayName(sellerProfile);

  const [
    { data: buyerAuthData, error: buyerAuthError },
    { data: sellerAuthData, error: sellerAuthError },
  ] = await Promise.all([
    supabaseAdmin.auth.admin.getUserById(
      order.buyer_id,
    ),
    supabaseAdmin.auth.admin.getUserById(
      order.seller_id,
    ),
  ]);

  if (buyerAuthError) {
    throw new Error(
      `Købers e-mail kunne ikke hentes: ${buyerAuthError.message}`,
    );
  }

  if (sellerAuthError) {
    throw new Error(
      `Sælgers e-mail kunne ikke hentes: ${sellerAuthError.message}`,
    );
  }

  const buyerEmail =
    buyerAuthData.user?.email ?? null;

  const sellerEmail =
    sellerAuthData.user?.email ?? null;

  const orderUrl =
    `${siteUrl}/mine-ordrer?order=${encodeURIComponent(order.id)}`;

  const sellerOrderUrl =
    `${siteUrl}/salg?order=${encodeURIComponent(order.id)}`;

  const itemPriceAmount = items.reduce(
    (sum, item) =>
      sum +
      Number(item.unit_price) *
        Number(item.quantity || 1),
    0,
  );

  const shippingPriceAmount =
    Number(order.shipping_price ?? 0);

  const totalAmount =
    Number(order.total ?? 0);

  const currency =
    (order.currency || "DKK").toUpperCase();

  const orderNumber =
    `EQ-${order.id
      .replaceAll("-", "")
      .slice(0, 8)
      .toUpperCase()}`;

  const results =
    await Promise.allSettled([
      buyerEmail
        ? sendOrderConfirmationEmail({
            to: {
              email: buyerEmail,
              name: buyerName || null,
            },
            props: {
              buyerName: buyerName || null,
              sellerName:
                sellerName || "sælgeren",
              listingTitle:
                primaryItem.title_snapshot,
              listingImageUrl,
              itemPrice: formatMoney(
                itemPriceAmount,
                currency,
              ),
              shippingPrice:
                shippingPriceAmount > 0
                  ? formatMoney(
                      shippingPriceAmount,
                      currency,
                    )
                  : null,
              totalPrice: formatMoney(
                totalAmount,
                currency,
              ),
              orderNumber,
              orderUrl,
            },
          })
        : Promise.resolve(null),

      sellerEmail
        ? sendItemSoldEmail({
            to: {
              email: sellerEmail,
              name: sellerName || null,
            },
            props: {
              sellerName:
                sellerName || null,
              buyerName:
                buyerName || "Køber",
              listingTitle:
                primaryItem.title_snapshot,
              listingImageUrl,
              salePrice: formatMoney(
                itemPriceAmount,
                currency,
              ),
              orderUrl: sellerOrderUrl,
            },
          })
        : Promise.resolve(null),
    ]);

  const buyerResult = results[0];
  const sellerResult = results[1];

  if (
    buyerEmail &&
    buyerResult.status === "rejected"
  ) {
    console.error(
      "Ordrebekræftelse kunne ikke sendes:",
      {
        orderId: order.id,
        buyerEmail,
        error: buyerResult.reason,
      },
    );
  }

  if (
    sellerEmail &&
    sellerResult.status === "rejected"
  ) {
    console.error(
      "Salgsmail kunne ikke sendes:",
      {
        orderId: order.id,
        sellerEmail,
        error: sellerResult.reason,
      },
    );
  }

  if (!buyerEmail) {
    console.warn(
      "Køber har ingen e-mail i Supabase Auth:",
      {
        orderId: order.id,
        buyerId: order.buyer_id,
      },
    );
  }

  if (!sellerEmail) {
    console.warn(
      "Sælger har ingen e-mail i Supabase Auth:",
      {
        orderId: order.id,
        sellerId: order.seller_id,
      },
    );
  }
}

async function handleCheckoutExpired(
  session: Stripe.Checkout.Session,
) {
  const orderId =
    session.metadata?.order_id ||
    session.client_reference_id;

  if (!orderId) {
    return;
  }

  const { data: order, error: orderError } =
    await supabaseAdmin
      .from("orders")
      .select(`
        id,
        seller_id,
        payment_status,
        status,
        fulfillment_status
      `)
      .eq("id", orderId)
      .maybeSingle();

  if (orderError) {
    console.error(
      "Kunne ikke hente ordre ved checkout-timeout:",
      {
        orderId,
        code: orderError.code,
        message: orderError.message,
        details: orderError.details,
        hint: orderError.hint,
      },
    );

    throw orderError;
  }

  if (
    !order ||
    order.payment_status !== "unpaid"
  ) {
    return;
  }

  const { data: items, error: itemsError } =
    await supabaseAdmin
      .from("order_items")
      .select("listing_id")
      .eq("order_id", orderId);

  if (itemsError) {
    console.error(
      "Kunne ikke hente order_items ved checkout-timeout:",
      {
        orderId,
        code: itemsError.code,
        message: itemsError.message,
        details: itemsError.details,
        hint: itemsError.hint,
      },
    );

    throw itemsError;
  }

  const listingIds = Array.from(
    new Set(
      (items ?? [])
        .map((item) => item.listing_id)
        .filter(
          (listingId): listingId is string =>
            typeof listingId === "string" &&
            listingId.length > 0,
        ),
    ),
  );

  const {
    data: cancelledOrder,
    error: cancelOrderError,
  } = await supabaseAdmin
    .from("orders")
    .update({
      status: "cancelled",
      payment_status: "failed",
      fulfillment_status: "cancelled",
      payout_status: "cancelled",
    })
    .eq("id", orderId)
    .eq("payment_status", "unpaid")
    .select(`
      id,
      status,
      payment_status,
      fulfillment_status,
      payout_status
    `)
    .maybeSingle();

  if (cancelOrderError) {
    console.error(
      "Kunne ikke annullere udløbet checkout-ordre:",
      {
        orderId,
        code: cancelOrderError.code,
        message: cancelOrderError.message,
        details: cancelOrderError.details,
        hint: cancelOrderError.hint,
      },
    );

    throw cancelOrderError;
  }

  if (!cancelledOrder) {
    return;
  }

  if (listingIds.length > 0) {
    const {
      data: reactivatedListings,
      error: reactivateError,
    } = await supabaseAdmin
      .from("listings")
      .update({
        status: "active",
        reserved_by: null,
        reserved_at: null,
      })
      .in("id", listingIds)
      .eq("seller_id", order.seller_id)
      .select("id, status");

    if (reactivateError) {
      console.error(
        "Kunne ikke genaktivere annoncer efter checkout-timeout:",
        {
          orderId,
          listingIds,
          code: reactivateError.code,
          message: reactivateError.message,
          details: reactivateError.details,
          hint: reactivateError.hint,
        },
      );

      throw reactivateError;
    }

    console.log(
      "Annoncer genaktiveret efter checkout-timeout:",
      {
        orderId,
        listingIds,
        reactivatedListings,
      },
    );
  }

  console.log(
    "Checkout udløbet og ordre annulleret:",
    {
      orderId,
      listingIds,
    },
  );
}

function getDisplayName(
  profile: ProfileRow | null,
) {
  if (!profile) return "";

  if (profile.full_name?.trim()) {
    return profile.full_name.trim();
  }

  if (profile.username?.trim()) {
    return profile.username.trim();
  }

  return "";
}

function formatMoney(
  amount: number,
  currency: string,
) {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}