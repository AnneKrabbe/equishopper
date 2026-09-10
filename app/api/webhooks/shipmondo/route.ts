import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type WebhookBody = {
  data?: string;
};

type ShipmondoWebhookPayload = {
  webhook?: string;
  data?: ShipmondoMonitorData;
  url?: string;
};

type ShipmondoMonitorData = {
  shipment_id?: number | string;
  current_status?: string | null;
  current_state?: string | null;
  current_status_text?: string | null;
  current_status_registered_at?: string | null;
  carrier_code?: string | null;
  carrier_track_id?: string | null;
};

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.SHIPMONDO_WEBHOOK_SECRET?.trim();

    if (!secret) {
      console.error("SHIPMONDO_WEBHOOK_SECRET mangler.");
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    const body = (await request.json()) as WebhookBody;

    if (!body.data) {
      console.error("Shipmondo webhook mangler body.data.");
      return NextResponse.json({ ok: true, ignored: true });
    }

    const payload = verifyAndDecodeHs256Jwt<ShipmondoWebhookPayload>(
      body.data,
      secret,
    );

    const monitor = payload.data;

    if (!monitor) {
      console.error("Shipmondo webhook mangler monitor-data.");
      return NextResponse.json({ ok: true, ignored: true });
    }

    const shipmentId = String(monitor.shipment_id ?? "").trim();
    const status = monitor.current_status?.trim().toUpperCase() ?? "";
    const carrier = monitor.carrier_code?.trim().toLowerCase() ?? "";

    if (!shipmentId) {
      console.error("Shipmondo webhook mangler shipment_id.");
      return NextResponse.json({ ok: true, ignored: true });
    }

    const headerAction =
      request.headers.get("smd-action")?.trim().toLowerCase() ?? "";

    const isDelivered =
      headerAction === "delivered" || status === "DELIVERED";

    if (!isDelivered) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const { data: order, error: lookupError } = await supabaseAdmin
      .from("orders")
      .select(`
        id,
        shipping_shipment_id,
        shipping_delivered_at,
        payout_due_at,
        payment_status,
        payout_status
      `)
      .eq("shipping_shipment_id", shipmentId)
      .maybeSingle();

    if (lookupError) {
      throw lookupError;
    }

    if (!order) {
      console.warn("Ingen Equishopper-ordre matcher Shipmondo shipment.", {
        shipmentId,
      });

      return NextResponse.json({ ok: true, ignored: true });
    }

    const deliveredAt =
      parseIsoDate(monitor.current_status_registered_at) ??
      new Date();

    const existingDeliveredAt = parseIsoDate(order.shipping_delivered_at);
    const effectiveDeliveredAt = existingDeliveredAt ?? deliveredAt;

    const payoutDueAt =
      parseIsoDate(order.payout_due_at) ??
      new Date(effectiveDeliveredAt.getTime() + 48 * 60 * 60 * 1000);

    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        shipping_delivered_at: effectiveDeliveredAt.toISOString(),
        payout_due_at: payoutDueAt.toISOString(),
        shipmondo_monitor_status: status || "DELIVERED",
        shipmondo_monitor_updated_at:
          parseIsoDate(monitor.current_status_registered_at)?.toISOString() ??
          new Date().toISOString(),
      })
      .eq("id", order.id);

    if (updateError) {
      throw updateError;
    }

    console.info("DAO-levering registreret på Equishopper-ordre.", {
      orderId: order.id,
      shipmentId,
      carrier,
      deliveredAt: effectiveDeliveredAt.toISOString(),
      payoutDueAt: payoutDueAt.toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Shipmondo Shipment Monitor webhook fejlede:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Webhook kunne ikke behandles.",
      },
      { status: 500 },
    );
  }
}

function verifyAndDecodeHs256Jwt<T>(token: string, secret: string): T {
  const parts = token.split(".");

  if (parts.length !== 3) {
    throw new Error("Ugyldigt JWT-format.");
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;

  const header = JSON.parse(
    base64UrlDecode(encodedHeader).toString("utf8"),
  ) as { alg?: string };

  if (header.alg !== "HS256") {
    throw new Error("Webhook JWT bruger ikke HS256.");
  }

  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(signingInput)
    .digest();

  const receivedSignature = base64UrlDecode(encodedSignature);

  if (
    expectedSignature.length !== receivedSignature.length ||
    !crypto.timingSafeEqual(expectedSignature, receivedSignature)
  ) {
    throw new Error("Webhook JWT-signaturen er ugyldig.");
  }

  return JSON.parse(
    base64UrlDecode(encodedPayload).toString("utf8"),
  ) as T;
}

function base64UrlDecode(value: string) {
  const normalized = value
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const padding =
    normalized.length % 4 === 0
      ? ""
      : "=".repeat(4 - (normalized.length % 4));

  return Buffer.from(normalized + padding, "base64");
}

function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}
