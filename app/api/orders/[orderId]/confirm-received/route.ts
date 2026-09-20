import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  sendPaymentReleasedBuyerEmail,
  sendPaymentReleasedSellerEmail,
  sendReviewReminderEmail,
} from "@/lib/email/email-service";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    orderId: string;
  }>;
};

type NumericValue = number | string | null;

type PreparedOrder = {
  id: string;
  buyer_id: string;
  seller_id: string;

  payment_status: string | null;
  fulfillment_status: string | null;
  payout_status: string | null;

  currency: string | null;

  stripe_charge_id: string | null;
  stripe_transfer_id: string | null;
  seller_stripe_account_id: string | null;

  seller_payout_amount: NumericValue;

  payout_gross_amount: NumericValue;
  payout_adjustment_amount: NumericValue;
  payout_net_amount: NumericValue;
  payout_completed_without_transfer: boolean | null;
};

type SuccessResponse = {
  success: true;
  alreadyCompleted: boolean;
  transferId: string | null;
  completedWithoutTransfer: boolean;
  message: string;
  order?: PreparedOrder | null;
};

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  let preparedOrder: PreparedOrder | null = null;
  let stripeRequestStarted = false;

  try {
    const { orderId } = await context.params;

    if (!isUuid(orderId)) {
      return NextResponse.json(
        { error: "Ordre-id er ugyldigt." },
        { status: 400 },
      );
    }

    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "Du skal være logget ind." },
        { status: 401 },
      );
    }

    const { data: preparedData, error: prepareError } =
      await supabaseAdmin.rpc("prepare_order_payout", {
        p_order_id: orderId,
        p_buyer_id: user.id,
      });

    if (prepareError) {
      throw new Error(prepareError.message);
    }

    preparedOrder = normalizeOrder(preparedData);

    if (!preparedOrder) {
      throw new Error(
        "Ordren kunne ikke klargøres til udbetaling.",
      );
    }

    if (
      preparedOrder.payout_status === "paid" &&
      preparedOrder.stripe_transfer_id
    ) {
      await ensureReviewNotification(preparedOrder);
      await ensureReviewReminderEmail(preparedOrder);

      const response: SuccessResponse = {
        success: true,
        alreadyCompleted: true,
        transferId: preparedOrder.stripe_transfer_id,
        completedWithoutTransfer: false,
        message: "Ordren var allerede afsluttet og udbetalt.",
        order: preparedOrder,
      };

      return NextResponse.json(response);
    }

    if (
      preparedOrder.payout_status === "paid" &&
      preparedOrder.payout_completed_without_transfer
    ) {
      await ensureReviewNotification(preparedOrder);
      await ensureReviewReminderEmail(preparedOrder);

      const response: SuccessResponse = {
        success: true,
        alreadyCompleted: true,
        transferId: null,
        completedWithoutTransfer: true,
        message: "Ordren var allerede afsluttet.",
        order: preparedOrder,
      };

      return NextResponse.json(response);
    }

    const payoutAmount = toIntegerAmount(
      preparedOrder.payout_net_amount,
    );

    if (payoutAmount === null || payoutAmount < 0) {
      throw new Error(
        "Ordren mangler et gyldigt nettoudbetalingsbeløb.",
      );
    }

    if (payoutAmount === 0) {
      const { data: finalizedData, error: finalizeError } =
        await supabaseAdmin.rpc(
          "finalize_order_without_transfer",
          {
            p_order_id: preparedOrder.id,
            p_buyer_id: user.id,
          },
        );

      if (finalizeError) {
        throw new Error(finalizeError.message);
      }

      const finalizedOrder = normalizeOrder(finalizedData);

      await ensureReviewNotification(
        finalizedOrder ?? preparedOrder,
      );
      await ensureReviewReminderEmail(finalizedOrder ?? preparedOrder);
      await sendPaymentReleasedEmails(finalizedOrder ?? preparedOrder);

      const response: SuccessResponse = {
        success: true,
        alreadyCompleted: false,
        transferId: null,
        completedWithoutTransfer: true,
        message:
          "Ordren er afsluttet. Der var intet beløb til udbetaling til sælgeren.",
        order: finalizedOrder,
      };

      return NextResponse.json(response);
    }

    if (!preparedOrder.stripe_charge_id) {
      throw new Error("Ordren mangler Stripe charge-id.");
    }

    if (!preparedOrder.seller_stripe_account_id) {
      throw new Error(
        "Ordren mangler sælgerens Stripe-konto.",
      );
    }

    const currency =
      preparedOrder.currency?.toLowerCase() || "dkk";

    const idempotencyKey =
      `equishopper-order-payout-${orderId}`;

    stripeRequestStarted = true;

    const transfer = await stripe.transfers.create(
      {
        amount: payoutAmount,
        currency,
        destination:
          preparedOrder.seller_stripe_account_id,
        source_transaction:
          preparedOrder.stripe_charge_id,
        transfer_group: `ORDER_${preparedOrder.id}`,
        metadata: {
          order_id: preparedOrder.id,
          buyer_id: preparedOrder.buyer_id,
          seller_id: preparedOrder.seller_id,
          payout_gross_amount: String(
            preparedOrder.payout_gross_amount ?? 0,
          ),
          payout_adjustment_amount: String(
            preparedOrder.payout_adjustment_amount ?? 0,
          ),
          payout_net_amount: String(payoutAmount),
        },
        description:
          `Equishopper-udbetaling for ordre ${preparedOrder.id}`,
      },
      {
        idempotencyKey,
      },
    );

    const { data: finalizedData, error: finalizeError } =
      await supabaseAdmin.rpc(
        "finalize_order_after_transfer",
        {
          p_order_id: preparedOrder.id,
          p_buyer_id: user.id,
          p_transfer_id: transfer.id,
        },
      );

    if (finalizeError) {
      console.error(
        "Stripe-transferen blev oprettet, men ordren kunne ikke afsluttes:",
        {
          orderId: preparedOrder.id,
          transferId: transfer.id,
          error: finalizeError,
        },
      );

      throw new Error(
        "Udbetalingen blev oprettet, men ordren kunne ikke færdiggøres. Prøv igen.",
      );
    }

    const finalizedOrder = normalizeOrder(finalizedData);

    await ensureReviewNotification(
      finalizedOrder ?? preparedOrder,
    );
    await ensureReviewReminderEmail(finalizedOrder ?? preparedOrder);

    const payoutAdjustmentAmount = toNumber(
      preparedOrder.payout_adjustment_amount,
    );

    const response: SuccessResponse = {
      success: true,
      alreadyCompleted: false,
      transferId: transfer.id,
      completedWithoutTransfer: false,
      message:
        payoutAdjustmentAmount !== null &&
        payoutAdjustmentAmount > 0
          ? "Ordren er afsluttet. Sælgerens tidligere reguleringer er modregnet, og restbeløbet er frigivet."
          : "Ordren er afsluttet, og betalingen er frigivet til sælgeren.",
      order: finalizedOrder,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Ordren kunne ikke afsluttes:", error);

    if (preparedOrder && !stripeRequestStarted) {
      const errorText =
        error instanceof Error
          ? error.message
          : "Ukendt udbetalingsfejl.";

      const { error: failError } =
        await supabaseAdmin.rpc("fail_order_payout", {
          p_order_id: preparedOrder.id,
          p_error: errorText,
        });

      if (failError) {
        console.error(
          "Udbetalingsfejlen kunne ikke gemmes:",
          failError,
        );
      }
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Ordren kunne ikke afsluttes.",
      },
      {
        status: 400,
      },
    );
  }
}

async function sendPaymentReleasedEmails(order: PreparedOrder) {
  try {
    const [buyerAuthResult, sellerAuthResult, profilesResult, orderItemResult] =
      await Promise.all([
        supabaseAdmin.auth.admin.getUserById(order.buyer_id),
        supabaseAdmin.auth.admin.getUserById(order.seller_id),
        supabaseAdmin
          .from("profiles")
          .select("id, full_name")
          .in("id", [order.buyer_id, order.seller_id]),
        supabaseAdmin
          .from("order_items")
          .select("title_snapshot, unit_price, quantity")
          .eq("order_id", order.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);

    if (buyerAuthResult.error) {
      throw buyerAuthResult.error;
    }

    if (sellerAuthResult.error) {
      throw sellerAuthResult.error;
    }

    if (profilesResult.error) {
      throw profilesResult.error;
    }

    if (orderItemResult.error) {
      throw orderItemResult.error;
    }

    const buyerEmail = buyerAuthResult.data.user?.email ?? null;
    const sellerEmail = sellerAuthResult.data.user?.email ?? null;

    const buyerProfile = profilesResult.data?.find(
      (profile) => profile.id === order.buyer_id,
    );
    const sellerProfile = profilesResult.data?.find(
      (profile) => profile.id === order.seller_id,
    );

    const orderItem = orderItemResult.data;
    const listingTitle =
      orderItem?.title_snapshot?.trim() || "din handel";

    const unitPrice = Number(orderItem?.unit_price ?? 0);
    const quantity = Number(orderItem?.quantity ?? 1);

    const salePrice = formatDkkFromKroner(unitPrice * quantity);

    const payoutAmount = toIntegerAmount(
      order.payout_net_amount ?? order.seller_payout_amount,
    );

    if (payoutAmount === null || payoutAmount < 0) {
      throw new Error(
        "Kunne ikke beregne udbetalingsbeløbet til payout-mailen.",
      );
    }

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
            payoutAmount: formatDkkFromOre(payoutAmount),
            orderUrl,
          },
        }),
      );
    } else {
      console.warn(
        "Betalingsmail til sælger blev ikke sendt: sælger mangler e-mail.",
        { orderId: order.id },
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
      console.warn(
        "Betalingsmail til køber blev ikke sendt: køber mangler e-mail.",
        { orderId: order.id },
      );
    }

    const results = await Promise.allSettled(jobs);

    for (const result of results) {
      if (result.status === "rejected") {
        console.error(
          "En betalingsfrigivelsesmail kunne ikke sendes:",
          result.reason,
        );
      }
    }
  } catch (error) {
    /*
     * Mailfejl må aldrig blokere en allerede gennemført
     * Stripe-transfer eller afslutning af ordren.
     */
    console.error(
      "Betalingsfrigivelsesmailene kunne ikke sendes:",
      error,
    );
  }
}

function formatDkkFromOre(amount: number) {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "DKK",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

function formatDkkFromKroner(amount: number) {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "DKK",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

async function ensureReviewNotification(order: PreparedOrder) {
  try {
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
          "Du har modtaget din vare. Skriv en anmeldelse af sælgeren.",
        href: "/mine-ordrer",
      });

    if (insertError) {
      throw insertError;
    }
  } catch (error) {
    console.error(
      "Anmeldelsesnotifikationen kunne ikke oprettes:",
      error,
    );
  }
}

async function ensureReviewReminderEmail(order: PreparedOrder) {
  try {
    const { data: buyerAuth, error: buyerAuthError } =
      await supabaseAdmin.auth.admin.getUserById(order.buyer_id);

    if (buyerAuthError) {
      throw buyerAuthError;
    }

    const buyerEmail = buyerAuth.user?.email;

    if (!buyerEmail) {
      console.warn(
        "Anmeldelsesmail blev ikke sendt: køber mangler e-mail.",
        { orderId: order.id },
      );
      return;
    }

    const { data: buyerProfile, error: buyerProfileError } =
      await supabaseAdmin
        .from("profiles")
        .select("full_name")
        .eq("id", order.buyer_id)
        .maybeSingle();

    if (buyerProfileError) {
      console.error(
        "Kunne ikke hente køberprofil til anmeldelsesmail:",
        buyerProfileError,
      );
    }

    const { data: sellerProfile, error: sellerProfileError } =
      await supabaseAdmin
        .from("profiles")
        .select("full_name, username")
        .eq("id", order.seller_id)
        .maybeSingle();

    if (sellerProfileError) {
      console.error(
        "Kunne ikke hente sælgerprofil til anmeldelsesmail:",
        sellerProfileError,
      );
    }

    const { data: orderItem, error: orderItemError } =
      await supabaseAdmin
        .from("order_items")
        .select("listing_id, title_snapshot")
        .eq("order_id", order.id)
        .limit(1)
        .maybeSingle();

    if (orderItemError) {
      throw orderItemError;
    }

    const listingTitle =
      orderItem?.title_snapshot?.trim() || "din handel";

    let listingImageUrl: string | null = null;

    if (orderItem?.listing_id) {
      const { data: listing, error: listingError } =
        await supabaseAdmin
          .from("listings")
          .select("images")
          .eq("id", orderItem.listing_id)
          .maybeSingle();

      if (listingError) {
        console.error(
          "Kunne ikke hente varebillede til anmeldelsesmail:",
          listingError,
        );
      } else if (Array.isArray(listing?.images) && listing.images.length > 0) {
        listingImageUrl =
          typeof listing.images[0] === "string"
            ? listing.images[0]
            : null;
      }
    }

    const otherPartyName =
      sellerProfile?.full_name?.trim() ||
      sellerProfile?.username?.trim() ||
      "sælgeren";

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://equishopper.dk";

    const reviewUrl =
      `${siteUrl.replace(/\/$/, "")}/mine-ordrer`;

    await sendReviewReminderEmail({
      to: {
        email: buyerEmail,
        name: buyerProfile?.full_name ?? null,
      },
      props: {
        recipientName: buyerProfile?.full_name ?? null,
        otherPartyName,
        listingTitle,
        listingImageUrl,
        transactionRole: "buyer",
        reviewUrl,
      },
    });
  } catch (error) {
    /*
     * En mailfejl må aldrig blokere afslutning af ordren
     * eller udbetalingen til sælger.
     */
    console.error(
      "Anmeldelsesmailen kunne ikke sendes:",
      error,
    );
  }
}

async function getAuthenticatedUser(request: NextRequest) {
  const authorization =
    request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const accessToken =
    authorization.slice("Bearer ".length);

  const supabaseUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  const {
    data: { user },
    error,
  } = await supabaseUser.auth.getUser(accessToken);

  if (error || !user) {
    return null;
  }

  return user;
}

function normalizeOrder(
  value: unknown,
): PreparedOrder | null {
  if (Array.isArray(value)) {
    return (
      (value[0] as PreparedOrder | undefined) ?? null
    );
  }

  if (value && typeof value === "object") {
    return value as PreparedOrder;
  }

  return null;
}

function toNumber(value: NumericValue): number | null {
  if (value === null) {
    return null;
  }

  const numberValue =
    typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numberValue)) {
    return null;
  }

  return numberValue;
}

function toIntegerAmount(
  value: NumericValue,
): number | null {
  const numberValue = toNumber(value);

  if (
    numberValue === null ||
    !Number.isInteger(numberValue)
  ) {
    return null;
  }

  return numberValue;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
