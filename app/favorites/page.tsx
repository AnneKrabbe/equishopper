"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  HeartIcon as HeartIconSolid,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/solid";

import Header from "@/components/home/Header";
import { supabase } from "@/lib/supabase";

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
      sort_order: number | null;
    }[];
  } | null;
};

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function fetchFavorites() {
      try {
        setLoading(true);
        setMessage("");

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;

        if (!user) {
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
          .eq("user_id", user.id);

        if (error) throw error;

        const rows = (data ?? []) as unknown as FavoriteListing[];
        setFavorites(rows.filter((favorite) => favorite.listings));
      } catch (error) {
        console.error("Kunne ikke hente favoritter:", error);
        setMessage(
          error instanceof Error
            ? `Der skete en fejl: ${error.message}`
            : "Favoritterne kunne ikke hentes."
        );
      } finally {
        setLoading(false);
      }
    }

    void fetchFavorites();
  }, []);

  async function removeFavorite(listingId: string) {
    if (removingId) return;

    try {
      setRemovingId(listingId);
      setMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        setMessage("Du skal være logget ind for at ændre dine favoritter.");
        return;
      }

      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("listing_id", listingId);

      if (error) throw error;

      setFavorites((current) =>
        current.filter((favorite) => favorite.listing_id !== listingId)
      );

      window.dispatchEvent(
        new CustomEvent("equishopper-favorites-changed", {
          detail: { listingId, isFavorite: false },
        })
      );
    } catch (error) {
      console.error("Kunne ikke fjerne favorit:", error);
      setMessage(
        error instanceof Error
          ? `Favoritten kunne ikke fjernes: ${error.message}`
          : "Favoritten kunne ikke fjernes."
      );
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#f8f6f1]">
      <Header />

      <section className="bg-[#063f32]">
        <div className="mx-auto max-w-6xl px-5 pb-14 pt-32 md:px-8 md:pb-16 md:pt-40">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#d4af37]">
            Din samling
          </p>

          <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="font-serif text-4xl leading-tight text-white md:text-6xl">
                Mine favoritter
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-white/70 md:text-lg">
                Gemte annoncer, du nemt kan vende tilbage til.
              </p>
            </div>

            {!loading && favorites.length > 0 && (
              <div className="w-fit rounded-full border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-medium text-white backdrop-blur-sm">
                {favorites.length} {favorites.length === 1 ? "favorit" : "favoritter"}
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
              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-[#d9d2c5] border-t-[#063f32]" />
              <p className="mt-4 text-stone-500">Henter dine favoritter...</p>
            </div>
          </div>
        ) : favorites.length === 0 ? (
          <div className="rounded-[30px] border border-[#eadfcb] bg-white px-6 py-14 text-center shadow-[0_16px_40px_rgba(0,0,0,0.05)] md:px-12 md:py-20">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f4ead0]">
              <HeartIconSolid className="h-8 w-8 text-[#d4af37]" />
            </div>

            <h2 className="mt-6 font-serif text-3xl text-[#063f32] md:text-4xl">
              Ingen favoritter endnu
            </h2>

            <p className="mx-auto mt-4 max-w-xl leading-7 text-stone-600">
              Tryk på hjertet på en annonce for at gemme den og finde den igen her.
            </p>

            <Link
              href="/annoncer"
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#d4af37] px-7 py-3.5 font-semibold text-[#063f32] transition hover:bg-[#e1c05a]"
            >
              <MagnifyingGlassIcon className="h-5 w-5" />
              Se annoncer
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {favorites.map((favorite) => {
              const listing = favorite.listings;
              if (!listing) return null;

              const firstImage = [...(listing.listing_images ?? [])].sort(
                (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
              )[0];

              return (
                <article
                  key={favorite.listing_id}
                  className="group relative overflow-hidden rounded-[26px] border border-[#eadfcb] bg-white shadow-[0_12px_30px_rgba(0,0,0,0.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(0,0,0,0.09)]"
                >
                  <Link href={`/listing/${listing.id}`} className="block">
                    <div className="relative aspect-[4/5] overflow-hidden bg-[#f1ece2]">
                      {firstImage ? (
                        <img
                          src={firstImage.image_url}
                          alt={listing.title}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center px-6 text-center text-sm text-stone-400">
                          Intet billede
                        </div>
                      )}
                    </div>

                    <div className="p-5">
                      <h2 className="line-clamp-2 min-h-[3.2rem] font-serif text-xl leading-snug text-[#063f32]">
                        {listing.title}
                      </h2>

                      <p className="mt-3 text-xl font-semibold text-stone-900">
                        {Number(listing.price).toLocaleString("da-DK")} kr.
                      </p>

                      <p className="mt-3 line-clamp-1 text-sm text-stone-500">
                        {[listing.brand, listing.size, listing.location]
                          .filter(Boolean)
                          .join(" · ") || "Equishopper-annonce"}
                      </p>

                      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#063f32]">
                        Se annonce
                        <ArrowRightIcon className="h-4 w-4 transition group-hover:translate-x-1" />
                      </span>
                    </div>
                  </Link>

                  <button
                    type="button"
                    onClick={() => void removeFavorite(listing.id)}
                    disabled={removingId === listing.id}
                    aria-label="Fjern fra favoritter"
                    className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-[#d4af37] shadow-md backdrop-blur-sm transition hover:scale-105 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {removingId === listing.id ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#d4af37]/30 border-t-[#d4af37]" />
                    ) : (
                      <HeartIconSolid className="h-6 w-6" />
                    )}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}