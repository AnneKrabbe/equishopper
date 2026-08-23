import type { Metadata } from "next";

import { supabase } from "@/lib/supabase";
import ListingPageClient from "./ListingPageClient";

type ListingSeoRow = {
  id: string;
  title: string;
  price: number;
  brand: string | null;
  description: string | null;
  condition: string | null;
  main_category: string | null;
  subcategory: string | null;
  status: string | null;
  reserved_by: string | null;
  listing_images?: {
    image_url: string;
    sort_order: number;
  }[];
};

type ListingPageProps = {
  params: Promise<{ id: string }>;
};

const SITE_URL = "https://equishopper.dk";

async function getListingForSeo(id: string): Promise<ListingSeoRow | null> {
  const { data, error } = await supabase
    .from("listings")
    .select(`
      id,
      title,
      price,
      brand,
      description,
      condition,
      main_category,
      subcategory,
      status,
      reserved_by,
      listing_images (
        image_url,
        sort_order
      )
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Kunne ikke hente annonce til SEO:", error);
    return null;
  }

  return data as ListingSeoRow | null;
}

function buildSeoTitle(listing: ListingSeoRow) {
  const title = listing.title.trim();
  const brand = listing.brand?.trim();

  if (
    brand &&
    !title.toLocaleLowerCase("da-DK").includes(
      brand.toLocaleLowerCase("da-DK"),
    )
  ) {
    return `${brand} ${title}`;
  }

  return title;
}

function buildDescription(listing: ListingSeoRow) {
  const details = [
    listing.brand,
    listing.subcategory,
    listing.condition,
  ]
    .filter(Boolean)
    .join(" · ");

  const fallback = `Køb ${listing.title} brugt på Equishopper til ${Number(
    listing.price,
  ).toLocaleString("da-DK")} kr.${details ? ` ${details}.` : ""}`;

  const source = listing.description?.trim() || fallback;

  if (source.length <= 155) {
    return source;
  }

  return `${source.slice(0, 152).trimEnd()}...`;
}

function getSortedImages(listing: ListingSeoRow) {
  return [...(listing.listing_images ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((image) => image.image_url)
    .filter(Boolean);
}

export async function generateMetadata({
  params,
}: ListingPageProps): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListingForSeo(id);

  if (!listing) {
    return {
      title: "Annonce ikke fundet",
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  const title = buildSeoTitle(listing);
  const description = buildDescription(listing);
  const canonicalPath = `/listing/${listing.id}`;
  const images = getSortedImages(listing);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      type: "website",
      url: canonicalPath,
      title: `${title} | Equishopper`,
      description,
      images: images.length > 0 ? images : undefined,
      siteName: "Equishopper",
      locale: "da_DK",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Equishopper`,
      description,
      images: images.length > 0 ? images : undefined,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export default async function ListingPage({ params }: ListingPageProps) {
  const { id } = await params;
  const listing = await getListingForSeo(id);

  const productJsonLd = listing
    ? buildProductJsonLd(listing)
    : null;

  return (
    <>
      {productJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(productJsonLd).replace(/</g, "\\u003c"),
          }}
        />
      )}

      <ListingPageClient id={id} />
    </>
  );
}

function buildProductJsonLd(listing: ListingSeoRow) {
  const images = getSortedImages(listing);
  const status = listing.status?.toLowerCase() ?? "active";
  const available = status === "active" && !listing.reserved_by;
  const url = `${SITE_URL}/listing/${listing.id}`;

  const category = [
    listing.main_category,
    listing.subcategory,
  ]
    .filter(Boolean)
    .join(" > ");

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: buildSeoTitle(listing),
    description: buildDescription(listing),
    image: images,
    sku: listing.id,
    category: category || undefined,
    brand: listing.brand
      ? {
          "@type": "Brand",
          name: listing.brand,
        }
      : undefined,
    itemCondition: "https://schema.org/UsedCondition",
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "DKK",
      price: Number(listing.price).toFixed(2),
      availability: available
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/UsedCondition",
    },
  };
}