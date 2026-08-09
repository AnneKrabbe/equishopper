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
  refundAmount?: unknown;
  resolutionSummary?: unknown;
};

type PreparedOrder = {
  id: string;
  buyer_id: string;
  seller_id: string;
  currency: string | null;

  stripe_charge_id: string | null;
  stripe_refund_id: string | null;
  stripe_transfer_id: string | null;
  seller_stripe_account_id: string | null;

  refund_status: string | null;
  refunded_amount: number | null;

  payout_status: string | null;
  payout_gross_amount: number | null;
  payout_adjustment_amount: number | null;
  payout_net_amount: number | null;
  payout_completed_without_transfer: boolean | null;
};

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  let disputeId = "";
  let preparedOrder: PreparedOrder | null = null;
  let firstStripeRequestStarted = false;

  try {
    ({ id: disputeId } = await context.params);

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

    const refundAmount =
      typeof body.refundAmount === "number"
        ? body.refundAmount
        : Number.NaN;

    const resolutionSummary =
      typeof body.resolutionSummary === "string"
        ? body.resolutionSummary.trim()
        : "";

    if (
      !Number.isInteger(refundAmount) ||
      refundAmount <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Refusionsbeløbet skal være et positivt helt antal øre.",
        },
        { status: 400 },
      );
    }

    if (!resolutionSummary) {
      return NextResponse.json(
        { error: "Begrundelsen for afgørelsen mangler." },
        { status: 400 },
      );
    }

    const { data: preparedData, error: prepareError } =
      await supabaseAdmin.rpc(
        "prepare_dispute_partial_refund",
        {
          p_dispute_id: disputeId,
          p_admin_id: user.id,
          p_refund_amount: refundAmount,
          p_resolution_summary: resolutionSummary,
        },
      );

    if (prepareError) {
      throw new Error(prepareError.message);
    }

    preparedOrder = normalizeOrder(preparedData);

    if (!preparedOrder) {
      throw new Error(
        "Ordren kunne ikke klargøres til delvis refundering.",
      );
    }

    /*
     * Hvis både refund og payout allerede er afsluttet,
     * færdiggør vi blot tvisten idempotent.
     */
    if (
      preparedOrder.stripe_refund_id &&
      preparedOrder.payout_status === "paid" &&
      (
        preparedOrder.stripe_transfer_id ||
        preparedOrder.payout_completed_without_transfer
      )
    ) {
      const { error: finalizeDisputeError } =
        await supabaseAdmin.rpc(
          "finalize_dispute_partial_refund",
          {
            p_dispute_id: disputeId,
            p_admin_id: user.id,
            p_transfer_id:
              preparedOrder.stripe_transfer_id,
          },
        );

      if (finalizeDisputeError) {
        throw new Error(finalizeDisputeError.message);
      }

      return NextResponse.json({
        success: true,
        alreadyCompleted: true,
        refundId: preparedOrder.stripe_refund_id,
        transferId: preparedOrder.stripe_transfer_id,
        refundedAmount: preparedOrder.refunded_amount,
        sellerNetAmount: preparedOrder.payout_net_amount,
        message:
          "Den delvise refundering var allerede gennemført.",
      });
    }

    if (!preparedOrder.stripe_charge_id) {
      throw new Error("Ordren mangler Stripe charge-id.");
    }

    const stripeChargeId =
      preparedOrder.stripe_charge_id;

    /*
     * TRIN 1: Delvis refundering til køber.
     *
     * Samme idempotency key bruges ved alle genforsøg.
     */
    firstStripeRequestStarted = true;

    const refund = await stripe.refunds.create(
      {
        charge: stripeChargeId,
        amount: refundAmount,
        reason: "requested_by_customer",
        metadata: {
          dispute_id: disputeId,
          order_id: preparedOrder.id,
          buyer_id: preparedOrder.buyer_id,
          seller_id: preparedOrder.seller_id,
          resolution: "partial_refund",
        },
      },
      {
        idempotencyKey:
          `equishopper-dispute-partial-refund-${disputeId}`,
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

    const { data: recordedData, error: recordError } =
      await supabaseAdmin.rpc(
        "record_dispute_partial_refund",
        {
          p_dispute_id: disputeId,
          p_admin_id: user.id,
          p_refund_id: refund.id,
          p_refunded_amount: refund.amount,
          p_refund_status: refund.status ?? "pending",
        },
      );

    if (recordError) {
      throw new Error(
        "Refunderingen blev oprettet hos Stripe, men kunne ikke registreres i databasen. Prøv igen.",
      );
    }

    preparedOrder =
      normalizeOrder(recordedData) ?? preparedOrder;

    const sellerNetAmount =
      preparedOrder.payout_net_amount;

    if (
      typeof sellerNetAmount !== "number" ||
      !Number.isInteger(sellerNetAmount) ||
      sellerNetAmount < 0
    ) {
      throw new Error(
        "Ordren mangler et gyldigt nettoudbetalingsbeløb.",
      );
    }

    /*
     * TRIN 2A: Hele sælgerens restbeløb er modregnet.
     */
    if (sellerNetAmount === 0) {
      const { error: finalizeOrderError } =
        await supabaseAdmin.rpc(
          "finalize_partial_refund_order",
          {
            p_dispute_id: disputeId,
            p_admin_id: user.id,
            p_transfer_id: null,
          },
        );

      if (finalizeOrderError) {
        throw new Error(finalizeOrderError.message);
      }

      const { error: finalizeDisputeError } =
        await supabaseAdmin.rpc(
          "finalize_dispute_partial_refund",
          {
            p_dispute_id: disputeId,
            p_admin_id: user.id,
            p_transfer_id: null,
          },
        );

      if (finalizeDisputeError) {
        throw new Error(finalizeDisputeError.message);
      }

      return NextResponse.json({
        success: true,
        alreadyCompleted: false,
        refundId: refund.id,
        transferId: null,
        refundedAmount: refund.amount,
        sellerNetAmount: 0,
        message:
          "Køber er delvist refunderet. Sælgers resterende udbetaling blev fuldt modregnet.",
      });
    }

    /*
     * TRIN 2B: Restbeløbet frigives til sælger.
     */
    if (!preparedOrder.seller_stripe_account_id) {
      throw new Error(
        "Ordren mangler sælgerens Stripe-konto.",
      );
    }

    const sellerStripeAccountId =
      preparedOrder.seller_stripe_account_id;

    const currency =
      preparedOrder.currency?.toLowerCase() || "dkk";

    const transfer = await stripe.transfers.create(
      {
        amount: sellerNetAmount,
        currency,
        destination: sellerStripeAccountId,
        source_transaction: stripeChargeId,
        transfer_group:
          `ORDER_${preparedOrder.id}`,
        metadata: {
          dispute_id: disputeId,
          order_id: preparedOrder.id,
          resolution: "partial_refund",
          refund_id: refund.id,
          refunded_amount: String(refund.amount),
          seller_gross_after_refund: String(
            preparedOrder.payout_gross_amount ?? 0,
          ),
          seller_adjustment_amount: String(
            preparedOrder.payout_adjustment_amount ?? 0,
          ),
          seller_net_amount: String(sellerNetAmount),
        },
        description:
          `Equishopper restudbetaling efter delvis refundering for ordre ${preparedOrder.id}`,
      },
      {
        idempotencyKey:
          `equishopper-dispute-partial-transfer-${disputeId}`,
      },
    );

    const { error: finalizeOrderError } =
      await supabaseAdmin.rpc(
        "finalize_partial_refund_order",
        {
          p_dispute_id: disputeId,
          p_admin_id: user.id,
          p_transfer_id: transfer.id,
        },
      );

    if (finalizeOrderError) {
      console.error(
        "Transferen blev oprettet, men ordren kunne ikke færdiggøres:",
        {
          disputeId,
          orderId: preparedOrder.id,
          transferId: transfer.id,
          error: finalizeOrderError,
        },
      );

      throw new Error(
        "Refunderingen og sælgertransferen blev oprettet, men ordren kunne ikke færdiggøres. Prøv igen.",
      );
    }

    const { error: finalizeDisputeError } =
      await supabaseAdmin.rpc(
        "finalize_dispute_partial_refund",
        {
          p_dispute_id: disputeId,
          p_admin_id: user.id,
          p_transfer_id: transfer.id,
        },
      );

    if (finalizeDisputeError) {
      throw new Error(
        "De økonomiske bevægelser er gennemført, men tvisten kunne ikke færdiggøres. Prøv igen.",
      );
    }

    return NextResponse.json({
      success: true,
      alreadyCompleted: false,
      refundId: refund.id,
      transferId: transfer.id,
      refundedAmount: refund.amount,
      sellerNetAmount,
      sellerAdjustmentAmount:
        preparedOrder.payout_adjustment_amount ?? 0,
      message:
        preparedOrder.payout_adjustment_amount &&
        preparedOrder.payout_adjustment_amount > 0
          ? "Køber er delvist refunderet. Sælgerreguleringer er modregnet, og restbeløbet er frigivet til sælger."
          : "Køber er delvist refunderet, og restbeløbet er frigivet til sælger.",
    });
  } catch (error) {
    console.error(
      "Den delvise refundering kunne ikke gennemføres:",
      error,
    );

    /*
     * Kun fejl før første Stripe-kald kan rulles sikkert tilbage.
     * Efter Stripe-kaldet bevares processing, og næste forsøg
     * bruger de samme idempotency keys.
     */
    if (
      preparedOrder &&
      !firstStripeRequestStarted &&
      disputeId
    ) {
      const errorText =
        error instanceof Error
          ? error.message
          : "Ukendt fejl ved delvis refundering.";

      const { error: rollbackError } =
        await supabaseAdmin.rpc(
          "rollback_dispute_partial_refund",
          {
            p_dispute_id: disputeId,
            p_error: errorText,
          },
        );

      if (rollbackError) {
        console.error(
          "Reservationen kunne ikke rulles tilbage:",
          rollbackError,
        );
      }
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Den delvise refundering kunne ikke gennemføres.",
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