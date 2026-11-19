import { NextRequest, NextResponse } from "next/server";
import { track } from "@vercel/analytics/server";
import { createClient } from "@supabase/supabase-js";

import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { calculateBuyerProtectionOere, calculateShippingOere } from "@/lib/checkout-pricing";

type CheckoutBody = {
  cartItemIds?: string[];
  shippingMethod?: "shipping" | "pickup";
  shippingCarrier?: "dao" | "gls" | "postnord";
  fullName?: string;
  addressLine1?: string;
  postalCode?: string;
  city?: string;
  phone?: string;
  shippingNote?: string;
  combinedShippingProductId?: string;

  servicePoint?: {
    id?: string;
    name?: string;
    address?: string;
    postalCode?: string;
    city?: string;
  } | null;
};

type OrderRow = {
  id: string;
  buyer_id: string;
  seller_id: string;
  subtotal: number | string;
  shipping_price: number | string;
  buyer_protection_fee: number | string;
  total: number | string;
  currency: string;
};

type OrderItemRow = {
  listing_id: string;
  title_snapshot: string;
  unit_price: number | string;
  quantity: number;
};

type ShippingProductRow = {
  id: string;
  carrier: string;
  product_code: string;
  name: string;
  package_group: string;
  max_weight_grams: number;
  price_amount: number;
  currency: string;
  delivery_method: string;
  active: boolean;
  outbound_enabled: boolean;
};

type ListingShippingRow = {
  id: string;
  shipping_available: boolean | null;
  pickup_available: boolean | null;
  shipping_product_id: string | null;
  shipping_product: ShippingProductRow | null;
};

type ShippingSnapshot = {
  shippingPrice: number;
  shippingPriceAmount: number;
  shippingProductId: string | null;
  shippingProductCode: string | null;
  shippingProductName: string | null;
  shippingPackageGroup: string | null;
  shippingCurrency: string;
  shippingDeliveryMethod: string | null;
  shippingMaxWeightGrams: number | null;
};

type SellerStripeRow = {
  stripe_account_id: string | null;
  stripe_details_submitted: boolean;
  stripe_payouts_enabled: boolean;
};

type SellerFeeResult = {
  campaign_id: string | null;
  fee_bps: number;
};

const SHIPPING_GROUPS = {
  dao: "dao_shop",
  gls: "gls_shop",
  postnord: "postnord_shop",
} as const;

type ShippingCarrier = keyof typeof SHIPPING_GROUPS;
function isShippingCarrier(value: unknown): value is ShippingCarrier {
  return value === "dao" || value === "gls" || value === "postnord";
}

function buildShippingSnapshot(
  listings: ListingShippingRow[],
  shippingMethod: "shipping" | "pickup",
  carrier: ShippingCarrier,
  catalog: ShippingProductRow[],
  combinedProduct: ShippingProductRow | null,
): ShippingSnapshot {
  if (shippingMethod === "pickup") {
    if (listings.some((listing) => listing.pickup_available === false)) {
      throw new Error("Afhentning er ikke muligt for en eller flere varer. Vælg fragt.");
    }
    return {
      shippingPrice: 0,
      shippingPriceAmount: 0,
      shippingProductId: null,
      shippingProductCode: null,
      shippingProductName: null,
      shippingPackageGroup: null,
      shippingCurrency: "dkk",
      shippingDeliveryMethod: null,
      shippingMaxWeightGrams: null,
    };
  }
  if (!listings.length) throw new Error("Ordren indeholder ingen fragtbare varer.");
  for (const listing of listings) {
    const product = listing.shipping_product;
    if (!listing.shipping_available || !listing.shipping_product_id || !product ||
        !product.active || !product.outbound_enabled ||
        !Number.isFinite(product.max_weight_grams) || product.max_weight_grams <= 0 ||
        product.max_weight_grams > 15000) {
      throw new Error("En eller flere varer har ikke en gyldig fragtklasse (maks. 15 kg).");
    }
  }
  const options = catalog.filter((product) =>
    product.carrier.toLowerCase() === carrier &&
    product.package_group === SHIPPING_GROUPS[carrier] &&
    product.active && product.outbound_enabled &&
    product.currency.toLowerCase() === "dkk" &&
    Number.isInteger(product.price_amount) && product.price_amount > 0 &&
    [1000, 5000, 10000, 15000].includes(product.max_weight_grams),
  ).sort((a, b) => a.max_weight_grams - b.max_weight_grams);

  let chosen: ShippingProductRow | undefined;
  if (listings.length > 1) {
    chosen = options.find((option) => option.id === combinedProduct?.id);
    if (!chosen) throw new Error("Den valgte samlede fragtklasse er ugyldig.");
  } else {
    const listingProduct = listings[0].shipping_product!;
    if (carrier === "dao" && listingProduct.carrier.toLowerCase() === "dao") {
      // Bevar annoncen's eksisterende DAO-klasse ved ét køb.
      chosen = listingProduct;
    } else {
      chosen = options.find((option) =>
        option.max_weight_grams >= listingProduct.max_weight_grams,
      );
    }
    if (!chosen) throw new Error("Ingen fragtklasse passer til varens vægt.");
  }
  const shippingPriceAmount = calculateShippingOere(chosen.price_amount);
  return {
    shippingPrice: shippingPriceAmount / 100,
    shippingPriceAmount,
    shippingProductId: chosen.id,
    shippingProductCode: chosen.product_code,
    shippingProductName: chosen.name,
    shippingPackageGroup: chosen.package_group,
    shippingCurrency: "dkk",
    shippingDeliveryMethod: chosen.delivery_method,
    shippingMaxWeightGrams: chosen.max_weight_grams,
  };
}

export async function POST(request: NextRequest) {
  let orderId: string | null = null;
  let stripeSessionId: string | null = null;

  try {
    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Du skal være logget ind." },
        { status: 401 }
      );
    }

    const accessToken =
      authorization.slice("Bearer ".length);

    const body =
      (await request.json()) as CheckoutBody;

    if (!body.shippingMethod || !["shipping", "pickup"].includes(body.shippingMethod)) {
      return NextResponse.json(
        { error: "Vælg en leveringsmetode." },
        { status: 400 }
      );
    }

    const shippingCarrier = body.shippingCarrier ?? "dao";
    if (!isShippingCarrier(shippingCarrier)) {
      return NextResponse.json({ error: "Vælg et gyldigt fragtfirma." }, { status: 400 });
    }

    if (body.shippingMethod === "shipping") {
      if (
        !body.fullName?.trim() ||
        !body.addressLine1?.trim() ||
        !body.postalCode?.trim() ||
        !body.city?.trim()
      ) {
        return NextResponse.json(
          {
            error:
              "Udfyld navn, adresse, postnummer og by.",
          },
          { status: 400 }
        );
      }

      if (
        !body.servicePoint?.id?.trim() ||
        !body.servicePoint.name?.trim() ||
        !body.servicePoint.address?.trim() ||
        !body.servicePoint.postalCode?.trim() ||
        !body.servicePoint.city?.trim()
      ) {
        return NextResponse.json(
          {
            error:
              "Vælg en pakkeshop, før du går til betaling.",
          },
          { status: 400 }
        );
      }
    }

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
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        {
          error:
            "Din session er udløbet. Log ind igen.",
        },
        { status: 401 }
      );
    }

    const { error: expiryError } = await supabaseAdmin.rpc(
      "expire_cart_reservations", { p_buyer_id: user.id },
    );
    if (expiryError) throw expiryError;

    /*
     * Reservation, validering og ordreoprettelse sker atomisk i
     * create_pending_order. Databasen låser annoncerne, så to købere
     * ikke kan reservere den samme vare samtidigt.
     */

    /*
     * Opret den reserverede ordre gennem databasefunktionen.
     */
    const {
      data: createdOrderId,
      error: orderError,
    } = await supabaseUser.rpc(
      "create_pending_order",
      {
        p_shipping_method: body.shippingMethod,

        p_shipping_name:
          body.shippingMethod === "shipping"
            ? body.fullName?.trim() || null
            : null,

        p_shipping_address_line1:
          body.shippingMethod === "shipping"
            ? body.addressLine1?.trim() || null
            : null,

        p_shipping_postal_code:
          body.shippingMethod === "shipping"
            ? body.postalCode?.trim() || null
            : null,

        p_shipping_city:
          body.shippingMethod === "shipping"
            ? body.city?.trim() || null
            : null,

        p_shipping_phone:
          body.phone?.trim() || null,

        p_shipping_note:
          body.shippingNote?.trim() || null,
      }
    );

    if (orderError || !createdOrderId) {
      throw new Error(
        orderError?.message ||
          "Ordren kunne ikke oprettes."
      );
    }

    orderId = createdOrderId as string;

    /*
     * Hent ordren server-side.
     */
    const {
      data: orderData,
      error: orderReadError,
    } = await supabaseAdmin
      .from("orders")
      .select(`
        id,
        buyer_id,
        seller_id,
        subtotal,
        shipping_price,
        buyer_protection_fee,
        total,
        currency
      `)
      .eq("id", orderId)
      .eq("buyer_id", user.id)
      .single();

    if (orderReadError || !orderData) {
      throw new Error(
        "Den oprettede ordre kunne ikke hentes."
      );
    }

    const order = orderData as OrderRow;

    /*
     * Hent varerne og fragtprisen server-side.
     * Browserens pris bruges aldrig som facit.
     */
    const {
      data: itemData,
      error: itemError,
    } = await supabaseAdmin
      .from("order_items")
      .select(`
        listing_id,
        title_snapshot,
        unit_price,
        quantity
      `)
      .eq("order_id", order.id);

    if (
      itemError ||
      !itemData?.length
    ) {
      throw new Error(
        "Ordren indeholder ingen varer."
      );
    }

    const items =
      itemData as OrderItemRow[];

    const listingIds = Array.from(
      new Set(items.map((item) => item.listing_id)),
    );

    const { data: cart, error: cartError } = await supabaseUser
      .from("cart_items")
      .select("id, listing_id, reservation_expires_at")
      .eq("user_id", user.id)
      .in("listing_id", listingIds);

    if (
      cartError || !cart || cart.length !== listingIds.length ||
      cart.some((item) =>
        item.reservation_expires_at && Date.parse(item.reservation_expires_at) <= Date.now()
      ) ||
      (body.cartItemIds && (
        body.cartItemIds.length !== cart.length ||
        cart.some((item) => !body.cartItemIds?.includes(item.id))
      ))
    ) {
      throw new Error("Kurven er ændret, eller en reservation er udløbet. Opdatér kurven og prøv igen.");
    }

    const {
      data: listingData,
      error: listingError,
    } = await supabaseAdmin
      .from("listings")
      .select(`
        id,
        shipping_available,
        pickup_available,
        shipping_product_id,
        shipping_product:shipping_products (
          id,
          carrier,
          product_code,
          name,
          package_group,
          max_weight_grams,
          price_amount,
          currency,
          delivery_method,
          active,
          outbound_enabled
        )
      `)
      .in("id", listingIds);

    if (
      listingError ||
      !listingData ||
      listingData.length !== listingIds.length
    ) {
      throw new Error(
        "Fragtdata for en eller flere varer kunne ikke hentes.",
      );
    }

    // Hent priser og vægtklasser fra databasen. Browserens priser bruges aldrig.
    let combinedProduct: ShippingProductRow | null = null;
    if (body.shippingMethod === "shipping" && listingIds.length > 1) {
      if (!body.combinedShippingProductId ||
          !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(body.combinedShippingProductId)) {
        throw new Error("Vælg en samlet fragtklasse.");
      }
      const { data: chosenProduct, error: chosenError } = await supabaseAdmin
        .from("shipping_products")
        .select("id, carrier, product_code, name, package_group, max_weight_grams, price_amount, currency, delivery_method, active, outbound_enabled")
        .eq("id", body.combinedShippingProductId)
        .maybeSingle();
      if (chosenError || !chosenProduct) throw new Error("Fragtklassen findes ikke.");
      combinedProduct = chosenProduct as ShippingProductRow;
    }
    const { data: catalogData, error: catalogError } = await supabaseAdmin
      .from("shipping_products")
      .select("id, carrier, product_code, name, package_group, max_weight_grams, price_amount, currency, delivery_method, active, outbound_enabled")
      .eq("carrier", shippingCarrier)
      .eq("active", true)
      .eq("outbound_enabled", true);
    if (catalogError) throw new Error("Fragtpriserne kunne ikke hentes.");

    const shippingSnapshot = buildShippingSnapshot(
      listingData as unknown as ListingShippingRow[],
      body.shippingMethod,
      shippingCarrier,
      (catalogData ?? []) as ShippingProductRow[],
      combinedProduct,
    );

    const subtotal = Number(order.subtotal);
    const buyerProtectionFee = calculateBuyerProtectionOere(Math.round(subtotal * 100)) / 100;

    if (
      !Number.isFinite(subtotal) ||
      !Number.isFinite(buyerProtectionFee)
    ) {
      throw new Error(
        "Ordren indeholder ugyldige beløb.",
      );
    }

    const correctedTotal =
      Math.round(
        (
          subtotal +
          shippingSnapshot.shippingPrice +
          buyerProtectionFee
        ) * 100,
      ) / 100;

    const {
      error: shippingSaveError,
    } = await supabaseAdmin
      .from("orders")
      .update({
        shipping_price:
          shippingSnapshot.shippingPrice,
        buyer_protection_fee: buyerProtectionFee,
        total: correctedTotal,
        shipping_carrier:
          body.shippingMethod === "shipping"
            ? shippingCarrier
            : null,
        shipping_product_id:
          shippingSnapshot.shippingProductId,
        shipping_product_code:
          shippingSnapshot.shippingProductCode,
        shipping_product_name:
          shippingSnapshot.shippingProductName,
        shipping_package_group:
          shippingSnapshot.shippingPackageGroup,
        shipping_price_amount:
          shippingSnapshot.shippingPriceAmount,
        shipping_currency:
          shippingSnapshot.shippingCurrency,
        shipping_delivery_method:
          shippingSnapshot.shippingDeliveryMethod,
        shipping_max_weight_grams:
          shippingSnapshot.shippingMaxWeightGrams,

        shipping_service_point_id:
          body.shippingMethod === "shipping"
            ? body.servicePoint?.id?.trim() || null
            : null,

        shipping_service_point_name:
          body.shippingMethod === "shipping"
            ? body.servicePoint?.name?.trim() || null
            : null,

        shipping_service_point_address:
          body.shippingMethod === "shipping"
            ? body.servicePoint?.address?.trim() || null
            : null,

        shipping_service_point_postal_code:
          body.shippingMethod === "shipping"
            ? body.servicePoint?.postalCode?.trim() || null
            : null,

        shipping_service_point_city:
          body.shippingMethod === "shipping"
            ? body.servicePoint?.city?.trim() || null
            : null,
      })
      .eq("id", order.id)
      .eq("payment_status", "unpaid");

    if (shippingSaveError) {
      throw new Error(
        "Fragten kunne ikke gemmes på ordren.",
      );
    }

    /*
     * Hent sælgerens Stripe-status, men blokér ikke købet hvis onboarding
     * endnu ikke er færdig. Køberbetalingen sker på Equishoppers
     * platformkonto, og transferen til sælger sker først senere.
     *
     * Hvis Stripe allerede er klar, fastlåser vi account-id'et på ordren.
     * Hvis ikke, gemmes null, og payout-routen udfylder account-id'et,
     * når sælgeren senere har aktiveret udbetaling.
     */
    const {
      data: sellerData,
      error: sellerError,
    } = await supabaseAdmin
      .from("profiles")
      .select(`
        stripe_account_id,
        stripe_details_submitted,
        stripe_payouts_enabled
      `)
      .eq("id", order.seller_id)
      .single();

    if (sellerError || !sellerData) {
      throw new Error(
        "Sælgerens profil kunne ikke hentes."
      );
    }

    const seller =
      sellerData as SellerStripeRow;

    const sellerStripeReady = Boolean(
      seller.stripe_account_id &&
      seller.stripe_details_submitted &&
      seller.stripe_payouts_enabled
    );

    const sellerStripeAccountId =
      sellerStripeReady
        ? seller.stripe_account_id
        : null;

    /*
     * Find gældende sælgergebyr.
     *
     * Prioritet i SQL-funktionen:
     * 1. Individuel kampagne
     * 2. Generel kampagne
     * 3. Standardgebyr på 2 %
     */
    const {
      data: feeData,
      error: feeError,
    } = await supabaseAdmin.rpc(
      "resolve_seller_fee",
      {
        p_seller_id: order.seller_id,
        p_at: new Date().toISOString(),
      }
    );

    if (feeError) {
      throw new Error(
        "Sælgergebyret kunne ikke beregnes."
      );
    }

    const feeResult = Array.isArray(feeData)
      ? (feeData[0] as
          | SellerFeeResult
          | undefined)
      : (feeData as SellerFeeResult | null);

    const sellerFeeBps =
      feeResult?.fee_bps ?? 200;

    /*
     * Stripe-beløb gemmes i øre.
     *
     * Gebyret beregnes kun af varernes pris.
     * Køberbeskyttelsen tilhører platformen.
     *
     * Fragten tilhører ikke sælgeren.
     * Equishopper opkræver fragten og betaler transportøren.
     */
    const subtotalOere =
      toOere(order.subtotal);

    const shippingOere =
      shippingSnapshot.shippingPriceAmount;

    const platformFeeOere = Math.round(
      (subtotalOere * sellerFeeBps) / 10_000
    );

    const sellerPayoutOere =
      subtotalOere -
      platformFeeOere;

    if (sellerPayoutOere < 0) {
      throw new Error(
        "Sælgerens udbetalingsbeløb er ugyldigt."
      );
    }

    /*
     * Fastlås Stripe-konto, kampagne og beløb
     * på ordren inden betalingen startes.
     *
     * Dermed ændres en eksisterende ordre ikke,
     * hvis kampagnen senere redigeres.
     */
    const {
      error: feeSaveError,
    } = await supabaseAdmin
      .from("orders")
      .update({
        seller_stripe_account_id:
          sellerStripeAccountId,

        seller_fee_bps:
          sellerFeeBps,

        seller_fee_campaign_id:
          feeResult?.campaign_id ?? null,

        seller_fee:
          platformFeeOere / 100,

        seller_payout:
          sellerPayoutOere / 100,

        platform_fee_amount:
          platformFeeOere,

        seller_payout_amount:
          sellerPayoutOere,
      })
      .eq("id", order.id)
      .eq("payment_status", "unpaid");

    if (feeSaveError) {
      throw new Error(
        "Sælgergebyret kunne ikke gemmes på ordren."
      );
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      request.nextUrl.origin;

    // Stripe requires at least 30 minutes from session creation.
    const expiresAt = Math.ceil(Date.now() / 1000) + 30 * 60 + 15;

    /*
     * Opret betaling på Equishoppers
     * Stripe-platformkonto.
     *
     * Pengene overføres ikke til sælgeren her.
     * Den senere transfer oprettes først, når
     * ordren må frigives.
     */
    const session =
      await stripe.checkout.sessions.create({
        mode: "payment",
        locale: "da",

        // Vis både almindelige kort og MobilePay i Stripe Checkout.
        // Resten af Equishoppers betalings- og payout-flow er uændret.
        payment_method_types: ["card", "mobilepay", "klarna"],

        client_reference_id:
          order.id,

        customer_email:
          user.email || undefined,

        success_url:
          `${appUrl}/checkout/success` +
          `?session_id={CHECKOUT_SESSION_ID}`,

        cancel_url:
          `${appUrl}/kurv?betaling=annulleret`,

        expires_at:
          expiresAt,

        metadata: {
          order_id:
            order.id,

          buyer_id:
            order.buyer_id,

          seller_id:
            order.seller_id,

          seller_fee_bps:
            String(sellerFeeBps),

          seller_fee_campaign_id:
            feeResult?.campaign_id ?? "",

          seller_payout_amount:
            String(sellerPayoutOere),

          platform_fee_amount:
            String(platformFeeOere),

          shipping_carrier:
            body.shippingMethod === "shipping"
              ? shippingCarrier
              : "pickup",

          shipping_price_amount:
            String(
              shippingSnapshot.shippingPriceAmount,
            ),

          shipping_product_code:
            shippingSnapshot.shippingProductCode ?? "",

          shipping_service_point_id:
            body.shippingMethod === "shipping"
              ? body.servicePoint?.id?.trim() || ""
              : "",
        },

        payment_intent_data: {
          metadata: {
            order_id:
              order.id,

            buyer_id:
              order.buyer_id,

            seller_id:
              order.seller_id,

            shipping_carrier:
              body.shippingMethod === "shipping"
                ? shippingCarrier
                : "pickup",

            shipping_price_amount:
              String(
                shippingSnapshot.shippingPriceAmount,
              ),

            shipping_service_point_id:
              body.shippingMethod === "shipping"
                ? body.servicePoint?.id?.trim() || ""
                : "",
          },

          transfer_group:
            `ORDER_${order.id}`,
        },

        line_items: [
          ...items.map((item) => ({
            quantity:
              item.quantity,

            price_data: {
              currency: "dkk",

              unit_amount:
                toOere(item.unit_price),

              product_data: {
                name:
                  item.title_snapshot,
              },
            },
          })),

          ...(shippingOere > 0
            ? [
                {
                  quantity: 1,

                  price_data: {
                    currency: "dkk",

                    unit_amount:
                      shippingOere,

                    product_data: {
                      name:
                        shippingSnapshot.shippingProductName ||
                        "Fragt",
                    },
                  },
                },
              ]
            : []),

          {
            quantity: 1,

            price_data: {
              currency: "dkk",

              unit_amount:
                toOere(
                  buyerProtectionFee
                ),

              product_data: {
                name:
                  "Køberbeskyttelse",
              },
            },
          },
        ],
      });
    stripeSessionId = session.id;

    /*
     * Gem Checkout Session-id.
     */
    const {
      data: savedOrder,
      error: updateError,
    } = await supabaseAdmin
      .from("orders")
      .update({
        stripe_checkout_session_id:
          session.id,
        checkout_expires_at: new Date(session.expires_at * 1000).toISOString(),
      })
      .eq("id", order.id)
      .eq("payment_status", "unpaid")
      .select("id")
      .maybeSingle();

    if (updateError || !savedOrder) {
      throw new Error(
        "Stripe-sessionen kunne ikke gemmes."
      );
    }

    if (!session.url) {
      throw new Error(
        "Stripe returnerede ikke et checkout-link."
      );
    }

    try {
      await track("checkout_started");
    } catch (error) {
      console.warn("Kunne ikke registrere checkout_started:", error);
    }

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error(
      "Checkout-fejl:",
      error
    );

    if (orderId) {
      try {
        if (stripeSessionId) await stripe.checkout.sessions.expire(stripeSessionId);
        const { error: cancelError } = await supabaseAdmin.rpc(
          "cancel_cart_checkout", { p_order_id: orderId },
        );
        if (cancelError) throw cancelError;
      } catch (cleanupError) {
        console.error("Kunne ikke annullere checkout-ordren:", cleanupError);
      }
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Betalingen kunne ikke startes.",
      },
      { status: 400 }
    );
  }
}

function toOere(
  value: number | string
): number {
  const amount = Number(value);

  if (
    !Number.isFinite(amount) ||
    amount < 0
  ) {
    throw new Error(
      "Ordren indeholder et ugyldigt beløb."
    );
  }

  return Math.round(amount * 100);
}

export async function DELETE(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Du skal være logget ind." }, { status: 401 });
  }

  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
    authorization.slice("Bearer ".length),
  );
  if (userError || !user) {
    return NextResponse.json({ error: "Log ind igen for at ændre kurven." }, { status: 401 });
  }

  const cartItemId = request.nextUrl.searchParams.get("id");
  if (!cartItemId) {
    return NextResponse.json({ error: "Varen mangler." }, { status: 400 });
  }

  try {
    const { data: item, error: itemError } = await supabaseAdmin
      .from("cart_items")
      .select("listing_id")
      .eq("id", cartItemId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (itemError) throw itemError;
    if (!item) return new NextResponse(null, { status: 204 });

    const { data: orders, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select("id, stripe_checkout_session_id, order_items!inner(listing_id)")
      .eq("buyer_id", user.id)
      .eq("payment_status", "unpaid")
      .eq("order_items.listing_id", item.listing_id);
    if (ordersError) throw ordersError;

    for (const order of orders) {
      if (!order.stripe_checkout_session_id) {
        return NextResponse.json(
          { error: "Betalingen er ved at blive startet. Prøv igen om et øjeblik." },
          { status: 409 },
        );
      }

      const session = await stripe.checkout.sessions.retrieve(order.stripe_checkout_session_id);
      if (session.status !== "open" && session.status !== "expired") {
        return NextResponse.json(
          { error: "Betalingen er allerede sendt til behandling." },
          { status: 409 },
        );
      }
      if (session.status === "open") {
        await stripe.checkout.sessions.expire(session.id);
      }

      const { error: cancelError } = await supabaseAdmin.rpc(
        "cancel_cart_checkout", { p_order_id: order.id },
      );
      if (cancelError) throw cancelError;
    }

    const { error: deleteError } = await supabaseAdmin
      .from("cart_items")
      .delete()
      .eq("id", cartItemId)
      .eq("user_id", user.id);
    if (deleteError) throw deleteError;

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Kunne ikke fjerne kurvvaren:", error);
    return NextResponse.json(
      { error: "Varen kunne ikke fjernes. Opdatér kurven og prøv igen." },
      { status: 409 },
    );
  }
}
