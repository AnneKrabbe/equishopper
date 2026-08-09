import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type RequestBody = {
  resolutionSummary?: unknown;
};

type PreparedOrder = {
  id: string;
  buyer_id: string;
  seller_id: string;
  currency: string | null;
  payout_status: string | null;
  stripe_charge_id: string | null;
  stripe_transfer_id: string | null;
  seller_stripe_account_id: string | null;
  payout_gross_amount: number | null;
  payout_adjustment_amount: number | null;
  payout_net_amount: number | null;
  payout_completed_without_transfer: boolean | null;
};

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  let preparedOrder: PreparedOrder | null = null;
  let stripeRequestStarted = false;

  try {
    const { id: disputeId } = await context.params;

    if (!isUuid(disputeId)) {
      return NextResponse.json(
        { error: "Tvist-id er ugyldigt." },
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

    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError || profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Kun administratorer kan afgøre tvister." },
        { status: 403 },
      );
    }

    const body = (await request.json()) as RequestBody;
    const resolutionSummary =
      typeof body.resolutionSummary === "string"
        ? body.resolutionSummary.trim()
        : "";

    if (!resolutionSummary) {
      return NextResponse.json(
        { error: "Begrundelsen for afgørelsen mangler." },
        { status: 400 },
      );
    }

    const { data: preparedData, error: prepareError } =
      await supabaseAdmin.rpc(
        "prepare_dispute_seller_resolution",
        {
          p_dispute_id: disputeId,
          p_admin_id: user.id,
          p_resolution_summary: resolutionSummary,
        },
      );

    if (prepareError) {
      throw new Error(prepareError.message);
    }

    preparedOrder = normalizeOrder(preparedData);

    if (!preparedOrder) {
      throw new Error("Ordren kunne ikke klargøres til udbetaling.");
    }

    if (
      preparedOrder.payout_status === "paid" &&
      preparedOrder.stripe_transfer_id
    ) {
      return NextResponse.json({
        success: true,
        alreadyCompleted: true,
        transferId: preparedOrder.stripe_transfer_id,
        completedWithoutTransfer: false,
        message:
          "Tvisten var allerede afgjort til sælger, og betalingen var frigivet.",
      });
    }

    if (
      preparedOrder.payout_status === "paid" &&
      preparedOrder.payout_completed_without_transfer
    ) {
      return NextResponse.json({
        success: true,
        alreadyCompleted: true,
        transferId: null,
        completedWithoutTransfer: true,
        message:
          "Tvisten var allerede afgjort til sælger. Hele udbetalingen var modregnet.",
      });
    }

    const payoutAmount = preparedOrder.payout_net_amount;

    if (
      typeof payoutAmount !== "number" ||
      !Number.isInteger(payoutAmount) ||
      payoutAmount < 0
    ) {
      throw new Error("Ordren mangler et gyldigt nettoudbetalingsbeløb.");
    }

    if (payoutAmount === 0) {
      const { error: finalizeError } =
        await supabaseAdmin.rpc(
          "finalize_order_without_transfer",
          {
            p_order_id: preparedOrder.id,
            p_buyer_id: preparedOrder.buyer_id,
          },
        );

      if (finalizeError) {
        throw new Error(finalizeError.message);
      }

      return NextResponse.json({
        success: true,
        alreadyCompleted: false,
        transferId: null,
        completedWithoutTransfer: true,
        message:
          "Tvisten er afgjort til sælger. Hele udbetalingen blev modregnet i tidligere reguleringer.",
      });
    }

    if (!preparedOrder.stripe_charge_id) {
      throw new Error("Ordren mangler Stripe charge-id.");
    }

    if (!preparedOrder.seller_stripe_account_id) {
      throw new Error("Ordren mangler sælgerens Stripe-konto.");
    }

    const currency =
      preparedOrder.currency?.toLowerCase() || "dkk";

    const idempotencyKey =
      `equishopper-dispute-seller-${disputeId}`;

    stripeRequestStarted = true;

    const transfer = await stripe.transfers.create(
      {
        amount: payoutAmount,
        currency,
        destination:
          preparedOrder.seller_stripe_account_id,
        source_transaction:
          preparedOrder.stripe_charge_id,
        transfer_group:
          `ORDER_${preparedOrder.id}`,
        metadata: {
          dispute_id: disputeId,
          order_id: preparedOrder.id,
          resolution: "seller",
          payout_gross_amount: String(
            preparedOrder.payout_gross_amount ?? 0,
          ),
          payout_adjustment_amount: String(
            preparedOrder.payout_adjustment_amount ?? 0,
          ),
          payout_net_amount: String(payoutAmount),
        },
        description:
          `Equishopper tvistafgørelse til sælger for ordre ${preparedOrder.id}`,
      },
      { idempotencyKey },
    );

    const { error: finalizeError } =
      await supabaseAdmin.rpc(
        "finalize_order_after_transfer",
        {
          p_order_id: preparedOrder.id,
          p_buyer_id: preparedOrder.buyer_id,
          p_transfer_id: transfer.id,
        },
      );

    if (finalizeError) {
      console.error(
        "Stripe-transferen blev oprettet, men ordren kunne ikke afsluttes:",
        {
          disputeId,
          orderId: preparedOrder.id,
          transferId: transfer.id,
          error: finalizeError,
        },
      );

      throw new Error(
        "Udbetalingen blev oprettet, men ordren kunne ikke færdiggøres. Prøv igen.",
      );
    }

    return NextResponse.json({
      success: true,
      alreadyCompleted: false,
      transferId: transfer.id,
      completedWithoutTransfer: false,
      message:
        preparedOrder.payout_adjustment_amount &&
        preparedOrder.payout_adjustment_amount > 0
          ? "Tvisten er afgjort til sælger. Tidligere reguleringer er modregnet, og restbeløbet er frigivet."
          : "Tvisten er afgjort til sælger, og betalingen er frigivet.",
    });
  } catch (error) {
    console.error("Tvisten kunne ikke afgøres til sælger:", error);

    if (preparedOrder && !stripeRequestStarted) {
      const errorText =
        error instanceof Error
          ? error.message
          : "Ukendt fejl ved tvistafgørelsen.";

      const { error: rollbackError } =
        await supabaseAdmin.rpc(
          "rollback_dispute_seller_resolution",
          {
            p_dispute_id:
              (await context.params).id,
            p_error: errorText,
          },
        );

      if (rollbackError) {
        console.error(
          "Tvistafgørelsen kunne ikke rulles tilbage:",
          rollbackError,
        );
      }
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Tvisten kunne ikke afgøres til sælger.",
      },
      { status: 400 },
    );
  }
}

async function getAuthenticatedUser(
  request: NextRequest,
) {
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
      (value[0] as PreparedOrder | undefined) ??
      null
    );
  }

  if (value && typeof value === "object") {
    return value as PreparedOrder;
  }

  return null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}