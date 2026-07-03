"use client";

import { use, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { HeartIcon as HeartIconOutline } from "@heroicons/react/24/outline";
import { HeartIcon as HeartIconSolid } from "@heroicons/react/24/solid";

type Listing = {
  id: string;
  title: string;
  price: number;
  brand: string | null;
  size: string | null;
  color: string | null;
  condition: string | null;
  location: string | null;
  main_category: string | null;
  subcategory: string | null;
  shipping_available: boolean | null;
  receipt: boolean | null;
  description: string | null;
  view_count: number | null;
  is_we_love: boolean | null;
  listing_images?: {
    image_url: string;
    sort_order: number;
  }[];
};

export default function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [listing, setListing] = useState<Listing | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    async function fetchListing() {
      await supabase.rpc("increment_listing_view_count", {
  listing_id_input: id,
});
      const { data, error } = await supabase
        .from("listings")
        .select(`
          id,
          title,
          price,
          brand,
          size,
          color,
          condition,
          location,
          main_category,
          subcategory,
          shipping_available,
          receipt,
          description,
          view_count,
          is_we_love,
          listing_images (
            image_url,
            sort_order
          )
        `)
        .eq("id", id)
        .single();

      if (!error && data) {
        setListing(data as Listing);
        const { data: userData } = await supabase.auth.getUser();

if (userData.user) {
  const { data: favoriteData } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", userData.user.id)
    .eq("listing_id", id)
    .maybeSingle();

  setIsFavorite(!!favoriteData);
}
      }
    }

    fetchListing();
  }, [id]);

  if (!listing) {
    return (
      <main className="min-h-screen bg-stone-50 px-6 py-10">
        <p>Indlæser annonce...</p>
      </main>
    );
  }

  const images =
    listing.listing_images?.sort(
      (a, b) => a.sort_order - b.sort_order
    ) || [];

async function toggleFavorite() {
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user || !listing) {
    alert("Du skal være logget ind for at gemme favoritter.");
    return
  }

  if (isFavorite) {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", userData.user.id)
      .eq("listing_id", listing.id);

    if (error) {
      alert("Fejl ved fjern favorit: " + error.message);
      return;
    }

    const { error: decrementError } = await supabase.rpc("decrement_favorite_count", {
  listing_id_input: listing.id,
});

if (decrementError) {
  alert("Fejl ved decrement: " + decrementError.message);
}

    setIsFavorite(false);
  } else {
    const { error } = await supabase.from("favorites").insert({
      user_id: userData.user.id,
      listing_id: listing.id,
    });

    if (error) {
      alert("Fejl ved favorit: " + error.message);
      return;
    }

const { error: incrementError } = await supabase.rpc("increment_favorite_count", {
  listing_id_input: listing.id,
});

if (incrementError) {
  alert("Fejl ved increment: " + incrementError.message);
}

    setIsFavorite(true);
  }
}

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-2">
          <section className="space-y-4">
  
  {images[0] ? (
  <div className="relative">
   {listing.is_we_love && (
  <div className="absolute left-0 right-0 top-0 z-10 rounded-t-3xl bg-[#4f7c59]/95 py-3 text-white backdrop-blur-sm">
    <div className="flex items-center justify-center gap-5 text-xs font-semibold tracking-[0.35em] uppercase">
      <span className="h-px w-20 bg-white/70" />
      <div className="flex items-center gap-2">
  <HeartIconSolid className="h-5 w-5 text-white" />
  <span>WE LOVE</span>
</div>
      <span className="h-px w-20 bg-white/70" />
    </div>
  </div>
)}

    <img
      src={images[0].image_url}
      alt={listing.title}
      className="h-[520px] w-full rounded-3xl object-cover"
    />
  </div>
) : (
  <div className="flex h-[520px] items-center justify-center rounded-3xl bg-white text-stone-400">
    Intet billede
  </div>
)}

   
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {images.slice(1).map((image) => (
                  <img
                    key={image.image_url}
                    src={image.image_url}
                    alt=""
                    className="h-28 w-full rounded-2xl object-cover"
                  />
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl bg-white p-8 shadow">
           <div className="mb-3 flex items-start justify-between gap-4">
  <h1 className="text-4xl font-bold">
    {listing.title}
  </h1>

  <button
    type="button"
    onClick={toggleFavorite}
    className="text-[#d4af37]"
  >
    {isFavorite ? (
      <HeartIconSolid className="h-8 w-8" />
    ) : (
      <HeartIconOutline className="h-8 w-8" />
    )}
  </button>
</div>

            <p className="mb-8 text-3xl font-bold">
              {listing.price} kr.
            </p>

            <div className="mb-8 grid gap-3 text-sm">
              <p><strong>Mærke:</strong> {listing.brand || "-"}</p>
              <p><strong>Størrelse:</strong> {listing.size || "-"}</p>
              <p><strong>Farve:</strong> {listing.color || "-"}</p>
              <p><strong>Stand:</strong> {listing.condition || "-"}</p>
              <p><strong>Lokation:</strong> {listing.location || "-"}</p>
              <p><strong>Kategori:</strong>{" "}
              {[listing.main_category, listing.subcategory]
              .filter(Boolean)
              .join(" · ")}
              </p>
              <p><strong>Fragt muligt:</strong> {listing.shipping_available ? "Ja" : "Nej"}</p>
              <p><strong>Kvittering:</strong> {listing.receipt ? "Ja" : "Nej"}</p>
            </div>

            <div className="mb-8">
              <h2 className="mb-2 text-xl font-semibold">Beskrivelse</h2>
              <p className="whitespace-pre-wrap text-stone-700">
                {listing.description || "Ingen beskrivelse."}
              </p>
            </div>

            <button className="w-full rounded-full bg-black px-6 py-4 font-medium text-white">
              Kontakt sælger
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}