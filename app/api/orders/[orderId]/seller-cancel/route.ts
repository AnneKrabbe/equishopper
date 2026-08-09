import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    orderId: string;
  }>;
};

type OrderRow = {
  id: string;
  buyer_id: string;
  seller_id: string;
  status: string | null;
  payment_status: string | null;
  fulfillment_status: string | null;
  shipped_at: string | null;
  ready_for_pickup_at: string | null;
  completed_at: string | null;
  stripe_charge_id: string | null;
  stripe_transfer_id: string | null;
  stripe_refund_id: string | null;
  refund_status: string | null;
};

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
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

    const { data: orderData, error: orderError } =
      await supabaseAdmin
        .from("orders")
        .select(`
          id,
          buyer_id,
          seller_id,
          status,
          payment_status,
          fulfillment_status,
          shipped_at,
          ready_for_pickup_at,
          completed_at,
          stripe_charge_id,
          stripe_transfer_id,
          stripe_refund_id,
          refund_status
        `)
        .eq("id", orderId)
        .maybeSingle();

    if (orderError) {
      console.error(
        "Kunne ikke hente ordre til sælgerannullering:",
        orderError,
      );

      throw new Error(
        `Ordren kunne ikke hentes: ${orderError.message}`,
      );
    }

    if (!orderData) {
      return NextResponse.json(
        { error: "Ordren blev ikke fundet." },
        { status: 404 },
      );
    }

    const order = orderData as OrderRow;

    if (order.seller_id !== user.id) {
      return NextResponse.json(
        {
          error:
            "Kun sælgeren kan annullere dette salg.",
        },
        { status: 403 },
      );
    }

    /*
     * Idempotent genkald:
     * Hvis ordren allerede er annulleret/refunderet,
     * returnerer vi blot succes.
     */
    if (
      order.status === "cancelled" &&
      order.payment_status === "refunded"
    ) {
      return NextResponse.json({
        success: true,
        alreadyCancelled: true,
        refundId: order.stripe_refund_id,
        message: "Salget er allerede annulleret.",
      });
    }

    if (order.payment_status !== "paid") {
      return NextResponse.json(
        {
          error:
            "Kun en betalt ordre kan annulleres via denne handling.",
        },
        { status: 400 },
      );
    }

    if (
      order.shipped_at ||
      order.ready_for_pickup_at ||
      order.fulfillment_status === "shipped" ||
      order.fulfillment_status === "ready_for_pickup"
    ) {
      return NextResponse.json(
        {
          error:
            "Salget kan ikke annulleres, efter varen er sendt eller gjort klar til afhentning.",
        },
        { status: 409 },
      );
    }

    if (
      order.completed_at ||
      order.fulfillment_status === "completed"
    ) {
      return NextResponse.json(
        {
          error:
            "En afsluttet ordre kan ikke annulleres.",
        },
        { status: 409 },
      );
    }

    if (order.stripe_transfer_id) {
      return NextResponse.json(
        {
          error:
            "Ordren har allerede en Stripe-transfer og kan ikke annulleres af sælger.",
        },
        { status: 409 },
      );
    }

    const { data: activeDispute, error: disputeError } =
      await supabaseAdmin
        .from("disputes")
        .select("id")
        .eq("order_id", order.id)
        .in("status", [
          "open",
          "awaiting_buyer",
          "awaiting_seller",
          "under_review",
        ])
        .limit(1)
        .maybeSingle();

    if (disputeError) {
      console.error(
        "Kunne ikke kontrollere aktiv tvist:",
        disputeError,
      );

      throw new Error(
        `Tviststatus kunne ikke kontrolleres: ${disputeError.message}`,
      );
    }

    if (activeDispute) {
      return NextResponse.json(
        {
          error:
            "Ordren har en aktiv tvist og kan derfor ikke annulleres af sælger.",
        },
        { status: 409 },
      );
    }

    if (!order.stripe_charge_id) {
      return NextResponse.json(
        {
          error:
            "Ordren mangler Stripe charge-id og kan ikke refunderes automatisk.",
        },
        { status: 409 },
      );
    }

    /*
     * Fuld refundering.
     * Intet amount => hele det resterende refunderbare beløb.
     */
    const refund = await stripe.refunds.create(
      {
        charge: order.stripe_charge_id,
        reason: "requested_by_customer",
        metadata: {
          order_id: order.id,
          buyer_id: order.buyer_id,
          seller_id: order.seller_id,
          reason:
            "seller_cancelled_before_shipment",
        },
      },
      {
        idempotencyKey:
          `equishopper-seller-cancel-${order.id}`,
      },
    );

    if (
      refund.status === "failed" ||
      refund.status === "canceled"
    ) {
      throw new Error(
        `Stripe-refunderingen fik status ${refund.status}.`,
      );
    }

    /*
     * Hent annoncerne på ordren.
     */
    const { data: items, error: itemsError } =
      await supabaseAdmin
        .from("order_items")
        .select("listing_id")
        .eq("order_id", order.id);

    if (itemsError) {
      console.error(
        "Kunne ikke hente order_items efter refundering:",
        itemsError,
      );

      throw new Error(
        `Køber er refunderet, men varerne på ordren kunne ikke hentes: ${itemsError.message}`,
      );
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

    /*
     * KORREKT STATUSMODEL:
     *
     * status             -> cancelled
     * payment_status     -> refunded
     * fulfillment_status -> cancelled
     * payout_status      -> cancelled
     *
     * payment_status må IKKE være "cancelled",
     * fordi databaseconstrainten kun tillader:
     * unpaid, paid, refunded, failed.
     */
    const {
      data: cancelledOrderData,
      error: cancelOrderError,
    } = await supabaseAdmin
      .from("orders")
      .update({
        status: "cancelled",
        payment_status: "refunded",
        fulfillment_status: "cancelled",
        refund_status: refund.status ?? "pending",
        stripe_refund_id: refund.id,
        refunded_amount: refund.amount,
        payout_status: "cancelled",
      })
      .eq("id", order.id)
      .eq("seller_id", user.id)
      .eq("payment_status", "paid")
      .select(`
        id,
        status,
        payment_status,
        fulfillment_status,
        refund_status,
        refunded_amount,
        stripe_refund_id,
        payout_status
      `)
      .maybeSingle();

    if (cancelOrderError) {
      console.error(
        "Databasefejl ved annullering af ordre:",
        {
          orderId: order.id,
          refundId: refund.id,
          refundStatus: refund.status,
          refundAmount: refund.amount,
          code: cancelOrderError.code,
          message: cancelOrderError.message,
          details: cancelOrderError.details,
          hint: cancelOrderError.hint,
        },
      );

      throw new Error(
        `Køber er refunderet hos Stripe, men ordren kunne ikke markeres som annulleret: ${cancelOrderError.message}`,
      );
    }

    if (!cancelledOrderData) {
      throw new Error(
        "Køber er refunderet hos Stripe, men ingen ordre blev opdateret i databasen.",
      );
    }

    /*
     * Genaktivér annoncerne.
     */
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
          deleted_at: null,
        })
        .in("id", listingIds)
        .eq("seller_id", user.id)
        .select("id, status");

      if (reactivateError) {
        console.error(
          "Databasefejl ved genaktivering af annoncer:",
          {
            orderId: order.id,
            listingIds,
            code: reactivateError.code,
            message: reactivateError.message,
            details: reactivateError.details,
            hint: reactivateError.hint,
          },
        );

        throw new Error(
          `Køber er refunderet og ordren er annulleret, men annoncen kunne ikke genaktiveres automatisk: ${reactivateError.message}`,
        );
      }

      console.log(
        "Annoncer genaktiveret efter sælgerannullering:",
        reactivatedListings,
      );
    }

    console.log(
      "Sælgerannullering gennemført:",
      {
        orderId: order.id,
        refundId: refund.id,
        refundStatus: refund.status,
        refundAmount: refund.amount,
        listingIds,
      },
    );

    return NextResponse.json({
      success: true,
      alreadyCancelled: false,
      refundId: refund.id,
      refundedAmount: refund.amount,
      message:
        "Salget er annulleret. Køberen får hele betalingen tilbage, og annoncen er aktiv igen.",
    });
  } catch (error) {
    console.error(
      "Sælgerannullering fejlede:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Salget kunne ikke annulleres.",
      },
      { status: 500 },
    );
  }
}

async function getAuthenticatedUser(
  request: NextRequest,
) {
  const authorization =
    request.headers.get("authorization") ?? "";

  const accessToken =
    authorization.startsWith("Bearer ")
      ? authorization
          .slice("Bearer ".length)
          .trim()
      : "";

  if (!accessToken) {
    return null;
  }

  const supabaseUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
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
  } =
    await supabaseUser.auth.getUser(
      accessToken,
    );

  if (error || !user) {
    return null;
  }

  return user;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}