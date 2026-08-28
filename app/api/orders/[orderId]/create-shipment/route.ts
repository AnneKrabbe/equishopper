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

  shipping_service_point_id: string | null;
  shipping_service_point_name: string | null;
  shipping_service_point_address: string | null;
  shipping_service_point_postal_code: string | null;
  shipping_service_point_city: string | null;

  shipping_carrier: string | null;
  tracking_number: string | null;

  shipping_product_code: string | null;
  shipping_package_group: string | null;
  shipping_max_weight_grams: number | null;

  shipping_shipment_id: string | null;
  shipping_label_url: string | null;
  shipping_tracking_url: string | null;
  shipping_label_created_at: string | null;
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
          shipping_service_point_id,
          shipping_service_point_name,
          shipping_service_point_address,
          shipping_service_point_postal_code,
          shipping_service_point_city,
          shipping_carrier,
          tracking_number,
          shipping_product_code,
          shipping_package_group,
          shipping_max_weight_grams,
          shipping_shipment_id,
          shipping_label_url,
          shipping_tracking_url,
          shipping_label_created_at
        `)
        .eq("id", orderId)
        .maybeSingle();

    if (orderError) {
      console.error(
        "Kunne ikke hente ordre til Shipmondo:",
        orderError,
      );

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
        {
          error:
            "Forsendelsen kan først oprettes, når ordren er betalt.",
        },
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

    /*
     * Idempotens:
     * Har ordren allerede et Shipmondo-id eller trackingnummer,
     * returnerer vi den eksisterende label i stedet for at booke igen.
     */
    if (
      order.shipping_shipment_id?.trim() ||
      order.tracking_number?.trim()
    ) {
      return NextResponse.json({
        success: true,
        alreadyCreated: true,
        carrier: order.shipping_carrier?.trim() || "dao",
        shipmentId: order.shipping_shipment_id,
        trackingNumber: order.tracking_number,
        trackingUrl: order.shipping_tracking_url,
        labelUrl: order.shipping_label_url,
      });
    }

    /*
     * Equishoppers interne priskoder er fx DAO_SHOP_1KG.
     * Shipmondos faktiske daoSHOP-produktkode er DAO_STS og
     * vælges i DaoProvider. Derfor validerer vi package_group,
     * ikke den interne product_code.
     */
    if (
      order.shipping_carrier?.trim().toLowerCase() !== "dao" ||
      order.shipping_package_group !== "dao_shop"
    ) {
      return NextResponse.json(
        {
          error:
            "Ordren har ikke et gyldigt DAO daoSHOP-fragtprodukt.",
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

    if (!order.shipping_service_point_id?.trim()) {
      return NextResponse.json(
        {
          error:
            "Ordren mangler den DAO-pakkeshop, som køberen valgte ved checkout.",
        },
        { status: 409 },
      );
    }

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
      parcelShopId: order.shipping_service_point_id.trim(),

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

    const orderUpdate = {
      shipping_carrier: "dao",
      tracking_number:
        shipment.trackingNumber?.trim() || null,
      shipping_shipment_id:
        shipment.shipmentId?.trim() || null,
      shipping_label_url:
        shipment.labelUrl?.trim() || null,
      shipping_tracking_url:
        shipment.trackingUrl?.trim() || null,
      shipping_label_created_at:
        new Date().toISOString(),
    };

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
          trackingUrl: shipment.trackingUrl,
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
    console.error(
      "DAO-forsendelsen kunne ikke oprettes:",
      error,
    );

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

async function getAuthenticatedUser(
  request: NextRequest,
) {
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