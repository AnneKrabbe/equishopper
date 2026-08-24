import { NextRequest, NextResponse } from "next/server";

import { createShipment } from "@/lib/shipping/shipping-service";
import type { ShipmentRequest } from "@/lib/shipping/types";
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
  shipping_method: string | null;
  payment_status: string | null;
  fulfillment_status: string | null;
  shipping_name: string | null;
  shipping_address_line1: string | null;
  shipping_postal_code: string | null;
  shipping_city: string | null;
  shipping_phone: string | null;
  shipping_carrier: string | null;
  tracking_number: string | null;
  shipping_product_code: string | null;
  shipping_max_weight_grams: number | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
  phone: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
};

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "Du skal være logget ind." },
        { status: 401 },
      );
    }

    const { orderId: rawOrderId } = await context.params;
    const orderId = rawOrderId?.trim();

    if (!orderId) {
      return NextResponse.json(
        { error: "Ordre-id mangler." },
        { status: 400 },
      );
    }

    const { data: orderData, error: orderError } =
      await supabaseAdmin
        .from("orders")
        .select(`
          id,
          buyer_id,
          seller_id,
          shipping_method,
          payment_status,
          fulfillment_status,
          shipping_name,
          shipping_address_line1,
          shipping_postal_code,
          shipping_city,
          shipping_phone,
          shipping_carrier,
          tracking_number,
          shipping_product_code,
          shipping_max_weight_grams
        `)
        .eq("id", orderId)
        .maybeSingle();

    if (orderError) {
      console.error("Kunne ikke hente ordre til Shipmondo:", orderError);
      throw new Error("Ordren kunne ikke hentes.");
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
        { error: "Kun sælgeren kan oprette forsendelsen." },
        { status: 403 },
      );
    }

    if (order.shipping_method !== "shipping") {
      return NextResponse.json(
        { error: "Denne ordre er ikke oprettet med fragt." },
        { status: 409 },
      );
    }

    if (order.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Forsendelsen kan først oprettes, når ordren er betalt." },
        { status: 409 },
      );
    }

    if (
      order.fulfillment_status === "cancelled" ||
      order.fulfillment_status === "completed"
    ) {
      return NextResponse.json(
        {
          error:
            "Der kan ikke oprettes fragt på en afsluttet eller annulleret ordre.",
        },
        { status: 409 },
      );
    }

    if (order.tracking_number?.trim()) {
      return NextResponse.json({
        success: true,
        alreadyCreated: true,
        carrier: order.shipping_carrier?.trim() || "dao",
        trackingNumber: order.tracking_number.trim(),
        trackingUrl: null,
        labelUrl: null,
      });
    }

    if (order.shipping_product_code !== "DAO_STS") {
      return NextResponse.json(
        {
          error:
            "Ordren har ikke det forventede DAO Shop2Shop-fragtprodukt.",
        },
        { status: 409 },
      );
    }

    const weightGrams = Number(order.shipping_max_weight_grams);

    if (!Number.isFinite(weightGrams) || weightGrams <= 0) {
      return NextResponse.json(
        { error: "Ordren mangler en gyldig pakkevægt." },
        { status: 409 },
      );
    }

    validateReceiver(order);

    const { data: sellerProfileData, error: sellerProfileError } =
      await supabaseAdmin
        .from("profiles")
        .select(`
          id,
          full_name,
          username,
          phone,
          address,
          postal_code,
          city
        `)
        .eq("id", order.seller_id)
        .maybeSingle();

    if (sellerProfileError) {
      console.error(
        "Kunne ikke hente sælgerprofil til Shipmondo:",
        sellerProfileError,
      );
      throw new Error("Sælgerens profil kunne ikke hentes.");
    }

    if (!sellerProfileData) {
      return NextResponse.json(
        { error: "Sælgerprofilen blev ikke fundet." },
        { status: 409 },
      );
    }

    const sellerProfile = sellerProfileData as ProfileRow;
    validateSender(sellerProfile);

    const [sellerAuthResult, buyerAuthResult] = await Promise.all([
      supabaseAdmin.auth.admin.getUserById(order.seller_id),
      supabaseAdmin.auth.admin.getUserById(order.buyer_id),
    ]);

    if (sellerAuthResult.error) {
      throw new Error(
        `Sælgers e-mail kunne ikke hentes: ${sellerAuthResult.error.message}`,
      );
    }

    if (buyerAuthResult.error) {
      throw new Error(
        `Købers e-mail kunne ikke hentes: ${buyerAuthResult.error.message}`,
      );
    }

    const sellerEmail =
      sellerAuthResult.data.user?.email?.trim() ?? "";
    const buyerEmail =
      buyerAuthResult.data.user?.email?.trim() ?? "";

    if (!sellerEmail) {
      return NextResponse.json(
        { error: "Sælgeren mangler en e-mailadresse." },
        { status: 409 },
      );
    }

    if (!buyerEmail) {
      return NextResponse.json(
        { error: "Køberen mangler en e-mailadresse." },
        { status: 409 },
      );
    }

    const senderName =
      sellerProfile.full_name?.trim() ||
      sellerProfile.username?.trim() ||
      "Sælger";

    const shipmentRequest: ShipmentRequest = {
      provider: "dao",
      orderId: order.id,
      reference: `Equishopper ${order.id}`,
      weight: Math.round(weightGrams),

      sender: {
        name: senderName,
        address: sellerProfile.address!.trim(),
        zipCode: sellerProfile.postal_code!.trim(),
        city: sellerProfile.city!.trim(),
        country: "DK",
        email: sellerEmail,
        phone: sellerProfile.phone?.trim() || "",
      },

      receiver: {
        name: order.shipping_name!.trim(),
        address: order.shipping_address_line1!.trim(),
        zipCode: order.shipping_postal_code!.trim(),
        city: order.shipping_city!.trim(),
        country: "DK",
        email: buyerEmail,
        phone: order.shipping_phone?.trim() || "",
      },
    };

    const shipment = await createShipment(shipmentRequest);

    const orderUpdate: {
      shipping_carrier: string;
      tracking_number?: string;
    } = {
      shipping_carrier: "dao",
    };

    if (shipment.trackingNumber?.trim()) {
      orderUpdate.tracking_number = shipment.trackingNumber.trim();
    }

    const { error: updateError } =
      await supabaseAdmin
        .from("orders")
        .update(orderUpdate)
        .eq("id", order.id)
        .eq("seller_id", user.id);

    if (updateError) {
      console.error(
        "Shipmondo-forsendelsen blev oprettet, men ordren kunne ikke opdateres:",
        {
          orderId: order.id,
          shipmentId: shipment.shipmentId,
          updateError,
        },
      );

      return NextResponse.json(
        {
          error:
            "Forsendelsen blev oprettet hos Shipmondo, men kunne ikke gemmes på ordren. Opret ikke en ny forsendelse, før den eksisterende er kontrolleret i Shipmondo.",
          shipmentId: shipment.shipmentId,
          trackingNumber: shipment.trackingNumber,
          labelUrl: shipment.labelUrl,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      alreadyCreated: false,
      carrier: shipment.carrier,
      shipmentId: shipment.shipmentId,
      trackingNumber: shipment.trackingNumber,
      trackingUrl: shipment.trackingUrl,
      labelUrl: shipment.labelUrl,
    });
  } catch (error) {
    console.error("DAO-forsendelsen kunne ikke oprettes:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Forsendelsen kunne ikke oprettes.",
      },
      { status: 500 },
    );
  }
}

async function getAuthenticatedUser(request: NextRequest) {
  const authorization =
    request.headers.get("authorization") ?? "";

  const accessToken =
    authorization.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length).trim()
      : "";

  if (!accessToken) {
    return null;
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (error || !user) {
    return null;
  }

  return user;
}

function validateSender(profile: ProfileRow) {
  if (!profile.address?.trim()) {
    throw new Error("Din profil mangler en afsenderadresse.");
  }

  if (!profile.postal_code?.trim()) {
    throw new Error("Din profil mangler et postnummer.");
  }

  if (!profile.city?.trim()) {
    throw new Error("Din profil mangler en by.");
  }
}

function validateReceiver(order: OrderRow) {
  if (!order.shipping_name?.trim()) {
    throw new Error("Ordren mangler modtagernavn.");
  }

  if (!order.shipping_address_line1?.trim()) {
    throw new Error("Ordren mangler modtageradresse.");
  }

  if (!order.shipping_postal_code?.trim()) {
    throw new Error("Ordren mangler modtagerens postnummer.");
  }

  if (!order.shipping_city?.trim()) {
    throw new Error("Ordren mangler modtagerens by.");
  }
}