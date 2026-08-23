import type { MetadataRoute } from "next";

import { supabaseAdmin } from "@/lib/supabase-admin";

const SITE_URL = "https://equishopper.dk";

type ListingSitemapRow = {
  id: string;
  created_at: string | null;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/annoncer`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.95,
    },
  ];

  const { data, error } = await supabaseAdmin
    .from("listings")
    .select(`
      id,
      created_at
    `)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(
      "Kunne ikke bygge sitemap fra listings:",
      error,
    );

    return staticPages;
  }

  const listings = (data ?? []) as ListingSitemapRow[];

  const listingPages: MetadataRoute.Sitemap = listings.map(
    (listing) => ({
      url: `${SITE_URL}/listing/${listing.id}`,
      lastModified: listing.created_at ?? new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    }),
  );

  return [
    ...staticPages,
    ...listingPages,
  ];
}