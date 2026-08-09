import { NextRequest, NextResponse } from "next/server";

import { sendItemShippedEmail } from "@/lib/email/email-service";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type RequestBody = {
  orderId?: string;
};

type OrderRow = {
  id: string;
  buyer_id: string;
  seller_id: string;
  shipping_method: string | null;
  fulfillment_status: string | null;
  shipping_carrier: string | null;
  tracking_number: string | null;
  total: number | string | null;
  currency: string | null;
};

type OrderItemRow = {
  listing_id: string;
  title_snapshot: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
};

const siteUrl =
  (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://equishopper.dk"
  ).replace(/\/$/, "");

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "Du skal være logget ind." },
        { status: 401 },
      );
    }

    const body = (await request.json()) as RequestBody;
    const orderId = body.orderId?.trim();

    /*
     * orderId kommer fra en ordre, som allerede er hentet fra databasen
     * på /salg. Vi kræver derfor kun, at værdien findes.
     *
     * Vi undgår en for streng UUID-regex her, da den tidligere afviste
     * et ellers gyldigt ordre-id før databaseopslaget overhovedet blev kørt.
     */
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
          fulfillment_status,
          shipping_carrier,
          tracking_number,
          total,
          currency
        `)
        .eq("id", orderId)
        .maybeSingle();

    if (orderError) {
      console.error(
        "Kunne ikke hente ordre til afsendelsesmail:",
        {
          orderId,
          code: orderError.code,
          message: orderError.message,
          details: orderError.details,
          hint: orderError.hint,
        },
      );

      throw orderError;
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
            "Kun sælgeren kan udløse afsendelsesmailen.",
        },
        { status: 403 },
      );
    }

    if (order.shipping_method !== "shipping") {
      return NextResponse.json(
        {
          error:
            "Afsendelsesmail bruges kun til ordrer med fragt.",
        },
        { status: 409 },
      );
    }

    if (order.fulfillment_status !== "shipped") {
      return NextResponse.json(
        {
          error:
            "Ordren er endnu ikke markeret som sendt.",
        },
        { status: 409 },
      );
    }

    const { data: itemData, error: itemError } =
      await supabaseAdmin
        .from("order_items")
        .select("listing_id, title_snapshot")
        .eq("order_id", order.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

    if (itemError) {
      throw itemError;
    }

    if (!itemData) {
      return NextResponse.json(
        {
          error:
            "Ordren har ingen vare, som kan bruges i mailen.",
        },
        { status: 409 },
      );
    }

    const item = itemData as OrderItemRow;

    const { data: imageData, error: imageError } =
      await supabaseAdmin
        .from("listing_images")
        .select("image_url, sort_order")
        .eq("listing_id", item.listing_id)
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle();

    if (imageError) {
      console.error(
        "Kunne ikke hente billede til afsendelsesmail:",
        imageError,
      );
    }

    const { data: profileData, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("id, full_name, username")
        .in("id", [order.buyer_id, order.seller_id]);

    if (profileError) {
      throw profileError;
    }

    const profiles = (profileData ?? []) as ProfileRow[];

    const buyerProfile =
      profiles.find(
        (profile) => profile.id === order.buyer_id,
      ) ?? null;

    const sellerProfile =
      profiles.find(
        (profile) => profile.id === order.seller_id,
      ) ?? null;

    const buyerName =
      getDisplayName(buyerProfile) || null;

    const sellerName =
      getDisplayName(sellerProfile) || "Sælger";

    const {
      data: buyerAuthData,
      error: buyerAuthError,
    } =
      await supabaseAdmin.auth.admin.getUserById(
        order.buyer_id,
      );

    if (buyerAuthError) {
      throw new Error(
        `Købers e-mail kunne ikke hentes: ${buyerAuthError.message}`,
      );
    }

    const buyerEmail =
      buyerAuthData.user?.email ?? null;

    if (!buyerEmail) {
      return NextResponse.json(
        {
          error:
            "Køberen har ingen e-mailadresse i Supabase Auth.",
        },
        { status: 409 },
      );
    }

    const orderUrl =
      `${siteUrl}/mine-ordrer?order=${encodeURIComponent(order.id)}`;

    /*
     * Indtil DAO-integrationen leverer et eksternt trackinglink,
     * peger trackingknappen tilbage på ordren i Equishopper.
     */
    const trackingUrl = orderUrl;

    const result = await sendItemShippedEmail({
      to: {
        email: buyerEmail,
        name: buyerName,
      },
      props: {
        buyerName,
        sellerName,
        listingTitle: item.title_snapshot,
        listingImageUrl:
          imageData?.image_url ?? null,
        totalPrice: formatMoney(
          order.total,
          order.currency,
        ),
        carrierName:
          order.shipping_carrier?.trim() ||
          "Fragtfirma",
        trackingNumber:
          order.tracking_number?.trim() ||
          "Se ordren for leveringsstatus",
        trackingUrl,
        orderUrl,
      },
    });

    return NextResponse.json({
      success: true,
      emailId: result.id,
    });
  } catch (error) {
    console.error(
      "Afsendelsesmail kunne ikke sendes:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Afsendelsesmailen kunne ikke sendes.",
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

  const {
    data: { user },
    error,
  } =
    await supabaseAdmin.auth.getUser(
      accessToken,
    );

  if (error || !user) {
    return null;
  }

  return user;
}

function getDisplayName(
  profile: ProfileRow | null,
) {
  if (!profile) return "";

  if (profile.full_name?.trim()) {
    return profile.full_name.trim();
  }

  if (profile.username?.trim()) {
    return profile.username.trim();
  }

  return "";
}

function formatMoney(
  value: number | string | null,
  currency: string | null,
) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: (currency || "DKK").toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}