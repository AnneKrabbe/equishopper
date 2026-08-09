import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

type CheckoutBody = {
  shippingMethod?: "shipping" | "pickup";
  fullName?: string;
  addressLine1?: string;
  postalCode?: string;
  city?: string;
  phone?: string;
  shippingNote?: string;
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
  checkout_expires_at: string | null;
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

function buildShippingSnapshot(
  listings: ListingShippingRow[],
  shippingMethod: "shipping" | "pickup",
): ShippingSnapshot {
  if (shippingMethod === "pickup") {
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

  if (listings.length === 0) {
    throw new Error(
      "Ordren indeholder ingen annoncer, som kan fragtsættes.",
    );
  }

  const products = listings.map((listing) => {
    const product = listing.shipping_product;

    if (!listing.shipping_available) {
      throw new Error(
        "En eller flere varer kan kun afhentes.",
      );
    }

    if (
      !listing.shipping_product_id ||
      !product ||
      !product.active ||
      !product.outbound_enabled ||
      product.carrier.toLowerCase() !== "dao"
    ) {
      throw new Error(
        "En eller flere varer mangler en gyldig DAO-pakkeklasse.",
      );
    }

    if (product.currency.toLowerCase() !== "dkk") {
      throw new Error(
        "DAO-fragtproduktet har en ugyldig valuta.",
      );
    }

    if (
      !Number.isInteger(product.price_amount) ||
      product.price_amount <= 0
    ) {
      throw new Error(
        "DAO-fragtproduktet har en ugyldig pris.",
      );
    }

    return product;
  });

  const shippingPriceAmount = products.reduce(
    (sum, product) => sum + product.price_amount,
    0,
  );

  if (products.length === 1) {
    const product = products[0];

    return {
      shippingPrice: shippingPriceAmount / 100,
      shippingPriceAmount,
      shippingProductId: product.id,
      shippingProductCode: product.product_code,
      shippingProductName: product.name,
      shippingPackageGroup: product.package_group,
      shippingCurrency: product.currency.toLowerCase(),
      shippingDeliveryMethod: product.delivery_method,
      shippingMaxWeightGrams: product.max_weight_grams,
    };
  }

  return {
    shippingPrice: shippingPriceAmount / 100,
    shippingPriceAmount,
    shippingProductId: null,
    shippingProductCode: "DAO_MULTI_PACKAGE",
    shippingProductName: `DAO Shop2Shop · ${products.length} pakker`,
    shippingPackageGroup: "dao_multi_package",
    shippingCurrency: "dkk",
    shippingDeliveryMethod: "code_on_package",
    shippingMaxWeightGrams: null,
  };
}

export async function POST(request: NextRequest) {
  let orderId: string | null = null;

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

    if (!body.shippingMethod) {
      return NextResponse.json(
        { error: "Vælg en leveringsmetode." },
        { status: 400 }
      );
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

    /*
     * Opret først den reserverede ordre gennem den
     * eksisterende databasefunktion.
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
        currency,
        checkout_expires_at
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
     * Hent varerne og DAO-fragten server-side.
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

    const {
      data: listingData,
      error: listingError,
    } = await supabaseAdmin
      .from("listings")
      .select(`
        id,
        shipping_available,
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

    const shippingSnapshot =
      buildShippingSnapshot(
        listingData as unknown as ListingShippingRow[],
        body.shippingMethod,
      );

    const subtotal = Number(order.subtotal);
    const buyerProtectionFee =
      Number(order.buyer_protection_fee);

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
        total: correctedTotal,
        shipping_carrier:
          body.shippingMethod === "shipping"
            ? "dao"
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
      })
      .eq("id", order.id)
      .eq("payment_status", "unpaid");

    if (shippingSaveError) {
      throw new Error(
        "DAO-fragten kunne ikke gemmes på ordren.",
      );
    }

    /*
     * Kontrollér, at sælgeren har gennemført
     * Stripe Connect-onboarding.
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
        "Sælgerens betalingskonto kunne ikke hentes."
      );
    }

    const seller =
      sellerData as SellerStripeRow;

    if (
      !seller.stripe_account_id ||
      !seller.stripe_details_submitted ||
      !seller.stripe_payouts_enabled
    ) {
      throw new Error(
        "Sælgeren mangler at færdiggøre sin Stripe-konto, før varen kan købes."
      );
    }

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
     * DAO-fragten tilhører ikke sælgeren.
     * Equishopper opkræver fragten og betaler DAO.
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
          seller.stripe_account_id,

        seller_fee_bps:
          sellerFeeBps,

        seller_fee_campaign_id:
          feeResult?.campaign_id ?? null,

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

    const expiresAt =
      order.checkout_expires_at
        ? Math.floor(
            new Date(
              order.checkout_expires_at
            ).getTime() / 1000
          )
        : Math.floor(Date.now() / 1000) +
          30 * 60;

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
              ? "dao"
              : "pickup",

          shipping_price_amount:
            String(
              shippingSnapshot.shippingPriceAmount,
            ),

          shipping_product_code:
            shippingSnapshot.shippingProductCode ?? "",
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
                ? "dao"
                : "pickup",

            shipping_price_amount:
              String(
                shippingSnapshot.shippingPriceAmount,
              ),
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
                        "DAO-fragt",
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
                  order.buyer_protection_fee
                ),

              product_data: {
                name:
                  "Køberbeskyttelse",
              },
            },
          },
        ],
      });

    /*
     * Gem Checkout Session-id.
     */
    const {
      error: updateError,
    } = await supabaseAdmin
      .from("orders")
      .update({
        stripe_checkout_session_id:
          session.id,
      })
      .eq("id", order.id)
      .eq("payment_status", "unpaid");

    if (updateError) {
      throw new Error(
        "Stripe-sessionen kunne ikke gemmes."
      );
    }

    if (!session.url) {
      throw new Error(
        "Stripe returnerede ikke et checkout-link."
      );
    }

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error(
      "Checkout-fejl:",
      error
    );

    /*
     * Hvis betalingen ikke kan startes,
     * frigives varen igen.
     */
    if (orderId) {
      await releaseOrder(orderId);
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

async function releaseOrder(
  orderId: string
) {
  const { data: items } =
    await supabaseAdmin
      .from("order_items")
      .select("listing_id")
      .eq("order_id", orderId);

  const listingIds =
    (items ?? []).map(
      (item) => item.listing_id
    );

  if (listingIds.length > 0) {
    await supabaseAdmin
      .from("listings")
      .update({
        status: "active",
        reserved_by: null,
        reserved_at: null,
      })
      .in("id", listingIds);
  }

  await supabaseAdmin
    .from("orders")
    .update({
      status: "cancelled",
      payment_status: "cancelled",
    })
    .eq("id", orderId)
    .eq("payment_status", "unpaid");
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