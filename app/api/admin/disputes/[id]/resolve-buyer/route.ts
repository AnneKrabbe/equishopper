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
  refund_status: string | null;
  stripe_charge_id: string | null;
  stripe_refund_id: string | null;
  refunded_amount: number | null;
};

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  let disputeId = "";
  let preparedOrder: PreparedOrder | null = null;
  let stripeRequestStarted = false;

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
        "prepare_dispute_buyer_resolution",
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
      throw new Error("Ordren kunne ikke klargøres til refundering.");
    }

    if (preparedOrder.stripe_refund_id) {
      return NextResponse.json({
        success: true,
        alreadyCompleted: true,
        refundId: preparedOrder.stripe_refund_id,
        refundedAmount: preparedOrder.refunded_amount,
        message:
          "Tvisten var allerede afgjort til køber, og refunderingen var oprettet.",
      });
    }

    if (!preparedOrder.stripe_charge_id) {
      throw new Error("Ordren mangler Stripe charge-id.");
    }

    const idempotencyKey =
      `equishopper-dispute-buyer-full-${disputeId}`;

    stripeRequestStarted = true;

    /*
     * Intet amount-felt betyder fuld refundering af det
     * resterende, endnu ikke refunderede beløb på chargen.
     */
    const refund = await stripe.refunds.create(
      {
        charge: preparedOrder.stripe_charge_id,
        reason: "requested_by_customer",
        metadata: {
          dispute_id: disputeId,
          order_id: preparedOrder.id,
          buyer_id: preparedOrder.buyer_id,
          seller_id: preparedOrder.seller_id,
          resolution: "buyer_full_refund",
        },
      },
      {
        idempotencyKey,
      },
    );

    if (refund.status === "failed" || refund.status === "canceled") {
      throw new Error(
        `Stripe-refunderingen fik status ${refund.status}.`,
      );
    }

    const { error: finalizeError } =
      await supabaseAdmin.rpc(
        "finalize_dispute_buyer_resolution",
        {
          p_dispute_id: disputeId,
          p_admin_id: user.id,
          p_refund_id: refund.id,
          p_refunded_amount: refund.amount,
          p_refund_status: refund.status ?? "pending",
        },
      );

    if (finalizeError) {
      console.error(
        "Refunderingen blev oprettet, men databasen kunne ikke færdiggøres:",
        {
          disputeId,
          orderId: preparedOrder.id,
          refundId: refund.id,
          error: finalizeError,
        },
      );

      throw new Error(
        "Refunderingen blev oprettet hos Stripe, men sagen kunne ikke færdiggøres. Prøv igen.",
      );
    }

    return NextResponse.json({
      success: true,
      alreadyCompleted: false,
      refundId: refund.id,
      refundedAmount: refund.amount,
      refundStatus: refund.status,
      message:
        refund.status === "succeeded"
          ? "Tvisten er afgjort til køber, og beløbet er refunderet."
          : "Tvisten er afgjort til køber, og refunderingen er oprettet hos Stripe.",
    });
  } catch (error) {
    console.error("Tvisten kunne ikke afgøres til køber:", error);

    /*
     * Kun sikre fejl før Stripe-kaldet rulles tilbage.
     * Efter Stripe-kaldet beholdes processing, fordi refunderingen
     * kan være oprettet, selv hvis svaret eller databasekaldet fejlede.
     * Næste forsøg bruger samme idempotency key.
     */
    if (preparedOrder && !stripeRequestStarted && disputeId) {
      const errorText =
        error instanceof Error
          ? error.message
          : "Ukendt refusionsfejl.";

      const { error: rollbackError } =
        await supabaseAdmin.rpc(
          "rollback_dispute_buyer_resolution",
          {
            p_dispute_id: disputeId,
            p_error: errorText,
          },
        );

      if (rollbackError) {
        console.error(
          "Refusionsreservationen kunne ikke rulles tilbage:",
          rollbackError,
        );
      }
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Tvisten kunne ikke afgøres til køber.",
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