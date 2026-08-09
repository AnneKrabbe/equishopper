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

    const {
      data: preparedData,
      error: prepareError,
    } = await supabaseAdmin.rpc(
      "prepare_order_payout",
      {
        p_order_id: orderId,
        p_buyer_id: user.id,
      },
    );

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
      const response: SuccessResponse = {
        success: true,
        alreadyCompleted: true,
        transferId: preparedOrder.stripe_transfer_id,
        completedWithoutTransfer: false,
        message:
          "Ordren var allerede afsluttet og udbetalt.",
        order: preparedOrder,
      };

      return NextResponse.json(response);
    }

    if (
      preparedOrder.payout_status === "paid" &&
      preparedOrder.payout_completed_without_transfer
    ) {
      const response: SuccessResponse = {
        success: true,
        alreadyCompleted: true,
        transferId: null,
        completedWithoutTransfer: true,
        message:
          "Ordren var allerede afsluttet. Hele sælgerens udbetaling blev modregnet i tidligere reguleringer.",
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
      const {
        data: finalizedData,
        error: finalizeError,
      } = await supabaseAdmin.rpc(
        "finalize_order_without_transfer",
        {
          p_order_id: preparedOrder.id,
          p_buyer_id: user.id,
        },
      );

      if (finalizeError) {
        throw new Error(finalizeError.message);
      }

      const finalizedOrder =
        normalizeOrder(finalizedData);

      const response: SuccessResponse = {
        success: true,
        alreadyCompleted: false,
        transferId: null,
        completedWithoutTransfer: true,
        message:
          "Ordren er afsluttet. Hele sælgerens udbetaling blev modregnet i tidligere reguleringer.",
        order: finalizedOrder,
      };

      return NextResponse.json(response);
    }

    if (!preparedOrder.stripe_charge_id) {
      throw new Error(
        "Ordren mangler Stripe charge-id.",
      );
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
        transfer_group:
          `ORDER_${preparedOrder.id}`,
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

    const {
      data: finalizedData,
      error: finalizeError,
    } = await supabaseAdmin.rpc(
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

    const finalizedOrder =
      normalizeOrder(finalizedData);

    const payoutAdjustmentAmount =
      toNumber(preparedOrder.payout_adjustment_amount);

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
    console.error(
      "Ordren kunne ikke afsluttes:",
      error,
    );

    if (
      preparedOrder &&
      !stripeRequestStarted
    ) {
      const errorText =
        error instanceof Error
          ? error.message
          : "Ukendt udbetalingsfejl.";

      const { error: failError } =
        await supabaseAdmin.rpc(
          "fail_order_payout",
          {
            p_order_id: preparedOrder.id,
            p_error: errorText,
          },
        );

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
  } = await supabaseUser.auth.getUser(
    accessToken,
  );

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

  if (
    value &&
    typeof value === "object"
  ) {
    return value as PreparedOrder;
  }

  return null;
}

function toNumber(
  value: NumericValue,
): number | null {
  if (value === null) {
    return null;
  }

  const numberValue =
    typeof value === "number"
      ? value
      : Number(value);

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