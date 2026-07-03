"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { HeartIcon as HeartIconSolid } from "@heroicons/react/24/solid";

type Listing = {
  id: string;
  title: string;
  price: number;
  brand: string | null;
  size: string | null;
  location: string | null;
  created_at: string;
  is_we_love: boolean | null;
  listing_images?: {
    image_url: string;
    sort_order: number;
  }[];
};

export default function WeLovePage() {
  const [listings, setListings] = useState<Listing[]>([]);

  useEffect(() => {
    async function fetchListings() {
      const { data, error } = await supabase
        .from("listings")
        .select(`
          id,
          title,
          price,
          brand,
          size,
          location,
          created_at,
          is_we_love,
          listing_images (
            image_url,
            sort_order
          )
        `)
        .eq("is_we_love", true)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setListings(data as Listing[]);
      }
    }

    fetchListings();
  }, []);

  return (
    <main className="min-h-screen bg-stone-50">
      <section className="mx-auto max-w-7xl px-8 py-16">
       <h1 className="mb-3 text-4xl font-bold">
  💚 We Love
</h1>
        <p className="mb-10 text-stone-500">
          Håndplukkede favoritter fra Equishopper.
        </p>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {listings.map((listing) => {
            const firstImage = listing.listing_images
              ?.sort((a, b) => a.sort_order - b.sort_order)[0];

            return (
              <Link
                href={`/listing/${listing.id}`}
                key={listing.id}
                className="relative overflow-hidden rounded-3xl bg-white shadow transition hover:-translate-y-1 hover:shadow-lg"
              >
                {listing.is_we_love && (
                  <div className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-full bg-[#4f7c59]/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white shadow-sm">
                    <HeartIconSolid className="h-3 w-3 text-white" />
                    <span>We Love</span>
                  </div>
                )}

                {firstImage ? (
                  <img
                    src={firstImage.image_url}
                    alt={listing.title}
                    className="h-40 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center bg-stone-100 text-stone-400">
                    Intet billede
                  </div>
                )}

                <div className="p-4">
                  <h4 className="font-semibold">{listing.title}</h4>
                  <p className="font-bold">{listing.price} kr.</p>
                  <p className="text-sm text-stone-500">
                    {[listing.brand, listing.size, listing.location]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}