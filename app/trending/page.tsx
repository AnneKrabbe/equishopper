"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HeartIcon as HeartIconSolid } from "@heroicons/react/24/solid";
import { Loader2, Search } from "lucide-react";

import Header from "@/components/home/Header";
import { supabase } from "@/lib/supabase";

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


export default function TrendingPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function fetchListings() {
      try {
        setLoading(true);
        setMessage("");

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
          .order("trending_score", { ascending: false });

        if (error) throw error;

        setListings((data ?? []) as Listing[]);
      } catch (error) {
        console.error("Kunne ikke hente annoncer:", error);
        setMessage(
          error instanceof Error
            ? error.message
            : "Annoncerne kunne ikke hentes."
        );
      } finally {
        setLoading(false);
      }
    }

    void fetchListings();
  }, []);

  return (
    <main className="min-h-screen bg-[#f8f6f1]">
      <Header />

      <section className="border-b border-[#eadfcb] bg-[#063f32]">
        <div className="mx-auto max-w-6xl px-5 pb-14 pt-32 md:px-8 md:pb-16 md:pt-40">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#d4af37]">
            Populært lige nu
          </p>

          <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="font-serif text-4xl leading-tight text-white md:text-6xl">
                Trending
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-white/70 md:text-lg">
                De mest populære annoncer på Equishopper lige nu.
              </p>
            </div>

            {!loading && listings.length > 0 && (
              <div className="rounded-full border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-medium text-white backdrop-blur-sm">
                {listings.length} {listings.length === 1 ? "annonce" : "annoncer"}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-14">
        {message && (
          <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
            {message}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[360px] items-center justify-center">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#063f32]" />
              <p className="mt-4 text-stone-500">Henter annoncer...</p>
            </div>
          </div>
        ) : listings.length === 0 ? (
          <div className="rounded-[30px] border border-[#eadfcb] bg-white px-6 py-14 text-center shadow-[0_16px_40px_rgba(0,0,0,0.05)] md:px-12 md:py-20">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f4ead0]">
              <Search className="h-8 w-8 text-[#d4af37]" />
            </div>

            <h2 className="mt-6 font-serif text-3xl text-[#063f32] md:text-4xl">
              Ingen trending-annoncer endnu
            </h2>

            <p className="mx-auto mt-4 max-w-xl leading-7 text-stone-600">
              Når annoncer begynder at trende, vises de her.
            </p>

            <Link
              href="/annoncer"
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#d4af37] px-7 py-3.5 font-semibold text-[#063f32] transition hover:bg-[#e1c05a]"
            >
              <Search className="h-5 w-5" />
              Se alle annoncer
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listings.map((listing) => {
              const firstImage = [...(listing.listing_images ?? [])].sort(
                (a, b) => a.sort_order - b.sort_order
              )[0];

              return (
                <Link
                  href={`/listing/${listing.id}`}
                  key={listing.id}
                  className="group relative overflow-hidden rounded-[26px] border border-[#eadfcb] bg-white shadow-[0_12px_30px_rgba(0,0,0,0.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(0,0,0,0.09)]"
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-[#f1ece2]">
                    {listing.is_we_love && (
                      <div className="absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-[#d4af37] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#063f32]">
                        <HeartIconSolid className="h-3.5 w-3.5" />
                        We Love
                      </div>
                    )}

                    {firstImage ? (
                      <img
                        src={firstImage.image_url}
                        alt={listing.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-stone-100 text-stone-400">
                        Intet billede
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <h2 className="line-clamp-2 min-h-[3.2rem] font-serif text-xl leading-snug text-[#063f32]">
                      {listing.title}
                    </h2>

                    <p className="mt-3 text-xl font-semibold text-black">
                      {Number(listing.price).toLocaleString("da-DK")} kr.
                    </p>

                    <p className="mt-3 line-clamp-1 text-sm text-stone-500">
                      {[listing.brand, listing.size, listing.location]
                        .filter(Boolean)
                        .join(" · ") || "Equishopper-annonce"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}