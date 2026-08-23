import { supabaseAdmin } from "@/lib/supabase-admin";

const SITE_URL = "https://www.equishopper.dk";

type MerchantListing = {
  id: string;
  title: string;
  price: number;
  description: string | null;
  brand: string | null;
  size: string | null;
  color: string | null;
  condition: string | null;
  main_category: string | null;
  subcategory: string | null;
  status: string | null;
  shipping_available: boolean | null;
  shipping_product_id: string | null;

  listing_images:
    | {
        image_url: string;
        sort_order: number;
      }[]
    | null;
};

type ShippingProductRow = {
  id: string;
  max_weight_grams: number;
};

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function makeDescription(listing: MerchantListing) {
  const description = listing.description?.trim();

  if (description) {
    return description.slice(0, 5000);
  }

  const parts = [
    listing.brand,
    listing.subcategory,
    listing.main_category,
    listing.size ? `størrelse ${listing.size}` : null,
    listing.color,
  ].filter(Boolean);

  return `Brugt rideudstyr til salg på Equishopper${
    parts.length ? `: ${parts.join(", ")}` : ""
  }.`;
}

function makeProductType(listing: MerchantListing) {
  return [
    listing.main_category,
    listing.subcategory,
  ]
    .filter(Boolean)
    .join(" > ");
}

function formatShippingWeight(
  maxWeightGrams: number | null | undefined,
) {
  if (!maxWeightGrams || maxWeightGrams <= 0) {
    return null;
  }

  const kilos = maxWeightGrams / 1000;

  return `${kilos} kg`;
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("listings")
    .select(`
      id,
      title,
      price,
      description,
      brand,
      size,
      color,
      condition,
      main_category,
      subcategory,
      status,
      shipping_available,
      shipping_product_id,
      listing_images (
        image_url,
        sort_order
      )
    `)
    .eq("status", "active")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Kunne ikke bygge Google Merchant-feed:",
      error,
    );

    return new Response(
      "Kunne ikke bygge produktfeed.",
      {
        status: 500,
      },
    );
  }

  const listings =
    (data ?? []) as MerchantListing[];

  const shippingProductIds = Array.from(
    new Set(
      listings
        .map((listing) => listing.shipping_product_id)
        .filter(
          (id): id is string =>
            Boolean(id),
        ),
    ),
  );

  const shippingProductMap =
    new Map<string, ShippingProductRow>();

  if (shippingProductIds.length > 0) {
    const {
      data: shippingProducts,
      error: shippingProductsError,
    } = await supabaseAdmin
      .from("shipping_products")
      .select(`
        id,
        max_weight_grams
      `)
      .in("id", shippingProductIds);

    if (shippingProductsError) {
      console.error(
        "Kunne ikke hente fragtprodukter til Merchant-feed:",
        shippingProductsError,
      );
    } else {
      for (const product of
        (shippingProducts ?? []) as ShippingProductRow[]) {
        shippingProductMap.set(
          product.id,
          product,
        );
      }
    }
  }

  const items = listings
    .map((listing) => {
      const images = [
        ...(listing.listing_images ?? []),
      ].sort(
        (a, b) =>
          (a.sort_order ?? 0) -
          (b.sort_order ?? 0),
      );

      const image = images[0]?.image_url;

      /*
       * Google kræver et produktbillede.
       */
      if (!image) {
        return null;
      }

      /*
       * Produkter uden Equishopper-fragt bør ikke sendes
       * til Merchant Center med vægtbaseret shipping.
       */
      if (
        !listing.shipping_available ||
        !listing.shipping_product_id
      ) {
        return null;
      }

      const shippingProduct =
        shippingProductMap.get(
          listing.shipping_product_id,
        );

      const shippingWeight =
        formatShippingWeight(
          shippingProduct?.max_weight_grams,
        );

      /*
       * Hvis vi ikke kan finde den tilknyttede vægtklasse,
       * springer vi produktet over frem for at sende
       * forkert shipping-data til Google.
       */
      if (!shippingWeight) {
        return null;
      }

      const productUrl =
        `${SITE_URL}/listing/${listing.id}`;

      const description =
        makeDescription(listing);

      const productType =
        makeProductType(listing);

      const optionalBrand = listing.brand
        ? `
        <g:brand>${escapeXml(
          listing.brand,
        )}</g:brand>`
        : "";

      const optionalSize = listing.size
        ? `
        <g:size>${escapeXml(
          listing.size,
        )}</g:size>`
        : "";

      const optionalColor = listing.color
        ? `
        <g:color>${escapeXml(
          listing.color,
        )}</g:color>`
        : "";

      const optionalProductType = productType
        ? `
        <g:product_type>${escapeXml(
          productType,
        )}</g:product_type>`
        : "";

      return `
      <item>
        <g:id>${escapeXml(
          listing.id,
        )}</g:id>

        <g:title>${escapeXml(
          listing.title,
        )}</g:title>

        <g:description>${escapeXml(
          description,
        )}</g:description>

        <g:link>${escapeXml(
          productUrl,
        )}</g:link>

        <g:image_link>${escapeXml(
          image,
        )}</g:image_link>

        <g:availability>in_stock</g:availability>

        <g:condition>used</g:condition>

        <g:price>${Number(
          listing.price,
        ).toFixed(2)} DKK</g:price>

        <g:shipping_weight>${escapeXml(
          shippingWeight,
        )}</g:shipping_weight>

        ${optionalBrand}
        ${optionalSize}
        ${optionalColor}
        ${optionalProductType}
      </item>`;
    })
    .filter(Boolean)
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss
  version="2.0"
  xmlns:g="http://base.google.com/ns/1.0"
>
  <channel>
    <title>Equishopper - Brugt rideudstyr</title>
    <link>${SITE_URL}</link>
    <description>Brugt rideudstyr til salg på Equishopper</description>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type":
        "application/xml; charset=utf-8",

      "Cache-Control":
        "public, s-maxage=900, stale-while-revalidate=3600",
    },
  });
}