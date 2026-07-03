"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { HeartIcon as HeartIconSolid } from "@heroicons/react/24/solid";

type FavoriteListing = {
  listing_id: string;
  listings: {
    id: string;
    title: string;
    price: number;
    brand: string | null;
    size: string | null;
    location: string | null;
    listing_images?: {
      image_url: string;
      sort_order: number;
    }[];
  };
};

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteListing[]>([]);
  async function toggleFavorite(listingId: string) {
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) return;

  await supabase
    .from("favorites")
    .delete()
    .eq("user_id", userData.user.id)
    .eq("listing_id", listingId);

  setFavorites((current) =>
    current.filter(
      (favorite) => favorite.listings.id !== listingId
    )
  );
}
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function fetchFavorites() {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        setMessage("Du skal være logget ind for at se dine favoritter.");
        return;
      }

      const { data, error } = await supabase
        .from("favorites")
        .select(`
          listing_id,
          listings (
            id,
            title,
            price,
            brand,
            size,
            location,
            listing_images (
              image_url,
              sort_order
            )
          )
        `)
        .eq("user_id", userData.user.id);

      if (error) {
        setMessage("Der skete en fejl: " + error.message);
        return;
      }

      if (data) {
        setFavorites(data as unknown as FavoriteListing[]);
      }
    }

    fetchFavorites();
  }, []);

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <h1 className="mb-8 text-4xl font-bold">❤️ Mine favoritter</h1>
<p className="mb-10 text-lg text-stone-500">
  Gemte annoncer, du nemt kan vende tilbage til.
</p>

        {message && (
          <div className="rounded-3xl bg-white p-8 text-stone-600 shadow">
            {message}
          </div>
        )}

        {!message && favorites.length === 0 && (
          <div className="rounded-3xl bg-white p-8 text-stone-600 shadow">
            Du har ingen favoritter endnu.
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {favorites.map((favorite) => {
            const listing = favorite.listings;

            const firstImage = listing.listing_images
              ?.sort((a, b) => a.sort_order - b.sort_order)[0];

            return (
              <Link
       
  href={`/listing/${listing.id}`}
  key={listing.id}
  className="relative overflow-hidden rounded-3xl bg-white shadow transition hover:-translate-y-1 hover:shadow-lg"
>
     <button
  type="button"
  onClick={(e) => {
    e.preventDefault();
    toggleFavorite(listing.id);
  }}
  className="absolute right-3 top-3 z-20"
>
  <HeartIconSolid className="h-6 w-6 text-[#d4af37]" />
</button>

                {firstImage ? (
                  <img
                    src={firstImage.image_url}
                    alt={listing.title}
                    className="h-24 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-24 items-center justify-center bg-stone-100 text-stone-400">
                    Intet billede
                  </div>
                )}

                <div className="space-y-2 p-5">
                  <h4 className="font-semibold">{listing.title}</h4>

                  <p className="text-xl font-bold">
                    {listing.price} kr.
                  </p>

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
      </div>
    </main>
  );
}