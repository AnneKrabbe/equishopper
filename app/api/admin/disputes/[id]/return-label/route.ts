import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type RequestBody = {
  carrier?: unknown;
  trackingNumber?: unknown;
  labelUrl?: unknown;
  shippingCost?: unknown;
  returnDeadline?: unknown;
  resolutionSummary?: unknown;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: disputeId } = await context.params;

    if (!isUuid(disputeId)) {
      return NextResponse.json({ error: "Tvist-id er ugyldigt." }, { status: 400 });
    }

    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ error: "Du skal være logget ind." }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Kun administratorer kan oprette returlabels." },
        { status: 403 },
      );
    }

    const body = (await request.json()) as RequestBody;
    const carrier = readRequiredText(body.carrier, "Fragtfirma mangler.");
    const trackingNumber = readRequiredText(
      body.trackingNumber,
      "Trackingnummer mangler.",
    );

    const labelUrl =
      typeof body.labelUrl === "string" && body.labelUrl.trim()
        ? body.labelUrl.trim()
        : null;

    const shippingCost =
      typeof body.shippingCost === "number"
        ? body.shippingCost
        : Number(body.shippingCost);

    if (!Number.isInteger(shippingCost) || shippingCost <= 0) {
      throw new Error("Returfragtens pris er ugyldig.");
    }

    const returnDeadline =
      typeof body.returnDeadline === "string" && body.returnDeadline.trim()
        ? new Date(`${body.returnDeadline}T23:59:59.999Z`).toISOString()
        : null;

    const resolutionSummary =
      typeof body.resolutionSummary === "string"
        ? body.resolutionSummary.trim()
        : "";

    const { data: dispute, error: rpcError } = await supabaseAdmin.rpc(
      "register_dispute_return_label",
      {
        p_dispute_id: disputeId,
        p_admin_id: user.id,
        p_carrier: carrier,
        p_tracking_number: trackingNumber,
        p_label_url: labelUrl,
        p_shipping_cost: shippingCost,
        p_return_deadline_at: returnDeadline,
      },
    );

    if (rpcError) {
      throw new Error(rpcError.message);
    }

    const { error: updateError } = await supabaseAdmin
      .from("disputes")
      .update({
        status: "awaiting_buyer",
        resolution_summary: resolutionSummary || null,
        assigned_admin_id: user.id,
      })
      .eq("id", disputeId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    if (resolutionSummary) {
      const { error: eventError } = await supabaseAdmin
        .from("dispute_events")
        .insert({
          dispute_id: disputeId,
          actor_id: user.id,
          event_type: "admin_request",
          message: resolutionSummary,
          is_internal: false,
          metadata: {
            action: "return_required",
            carrier,
            tracking_number: trackingNumber,
            shipping_cost: shippingCost,
          },
        });

      if (eventError) {
        console.error("Returlabel oprettet, men beskeden fejlede:", eventError);
      }
    }

    return NextResponse.json({
      success: true,
      dispute,
      message:
        "Returlabelen er oprettet, og udgiften er registreret til modregning på sælgerens næste udbetaling.",
    });
  } catch (error) {
    console.error("Returlabel kunne ikke oprettes:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Returlabelen kunne ikke oprettes.",
      },
      { status: 400 },
    );
  }
}

async function getAuthenticatedUser(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) return null;

  const accessToken = authorization.slice("Bearer ".length);
  const supabaseUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );

  const {
    data: { user },
    error,
  } = await supabaseUser.auth.getUser(accessToken);

  return error || !user ? null : user;
}

function readRequiredText(value: unknown, message: string) {
  if (typeof value !== "string" || !value.trim()) throw new Error(message);
  return value.trim();
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}