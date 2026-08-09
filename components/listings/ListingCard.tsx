"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type ListingCardProps = {
  listing: {
    id: string;
    title: string;
    price: number;
    brand: string | null;
    size?: string | null;
    listing_images?: {
      image_url: string;
      sort_order: number;
    }[];
  };
};

export default function ListingCard({ listing }: ListingCardProps) {
  const router = useRouter();


  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoadingFavorite, setIsLoadingFavorite] = useState(true);
  const [isUpdatingFavorite, setIsUpdatingFavorite] = useState(false);

  const firstImage = listing.listing_images
    ? [...listing.listing_images].sort(
        (a, b) => a.sort_order - b.sort_order
      )[0]
    : null;

  useEffect(() => {
    async function loadFavoriteStatus() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsLoadingFavorite(false);
        return;
      }

      const { data, error } = await supabase
        .from("favorites")
        .select("id")
        .eq("user_id", user.id)
        .eq("listing_id", listing.id)
        .maybeSingle();

      if (error) {
        console.error("Kunne ikke hente favoritstatus:", error);
      }

      setIsFavorite(Boolean(data));
      setIsLoadingFavorite(false);
    }

    loadFavoriteStatus();
  }, [listing.id, supabase]);

  async function toggleFavorite() {
    if (isUpdatingFavorite) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push(`/login?redirect=/listing/${listing.id}`);
      return;
    }

    const previousValue = isFavorite;
    const nextValue = !previousValue;

    // Opdater hjertet med det samme
    setIsFavorite(nextValue);
    setIsUpdatingFavorite(true);

    if (nextValue) {
      const { error } = await supabase.from("favorites").insert({
        user_id: user.id,
        listing_id: listing.id,
      });

      if (error) {
        console.error("Kunne ikke gemme favorit:", error);
        setIsFavorite(previousValue);
      }
    } else {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("listing_id", listing.id);

      if (error) {
        console.error("Kunne ikke fjerne favorit:", error);
        setIsFavorite(previousValue);
      }
    }

    setIsUpdatingFavorite(false);
  }

  return (
    <article className="group relative h-full overflow-hidden rounded-[24px] bg-[#fbfaf7] shadow-[0_10px_28px_rgba(0,0,0,0.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_38px_rgba(0,0,0,0.10)]">
      <Link
        href={`/listing/${listing.id}`}
        className="flex h-full flex-col"
      >
        <div className="p-3 pb-0">
          <div className="relative aspect-[4/4.2] overflow-hidden rounded-[16px] bg-[#f1ece2]">
            {firstImage ? (
              <img
                src={firstImage.image_url}
                alt={listing.title}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <img
                  src="/images/equishopper-grey-logo.png"
                  alt=""
                  className="h-24 opacity-35"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col px-5 pb-6 pt-4">
          {listing.brand && (
            <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-[#b79a3d]">
              {listing.brand}
            </p>
          )}

          <h3 className="line-clamp-2 min-h-[40px] text-[15px] font-medium leading-5 text-[#063f32]">
            {listing.title}
          </h3>

          <div className="min-h-[28px]">
            {listing.size && (
              <p className="mt-1 text-xs text-stone-500">
                Str. {listing.size}
              </p>
            )}
          </div>

          <p className="mt-auto pt-4 text-[15px] font-semibold text-black">
            {listing.price.toLocaleString("da-DK")} kr.
          </p>
        </div>
      </Link>

      <button
        type="button"
        onClick={toggleFavorite}
        disabled={isLoadingFavorite || isUpdatingFavorite}
        aria-label={
          isFavorite
            ? "Fjern annonce fra favoritter"
            : "Gem annonce som favorit"
        }
        className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm transition hover:scale-105 disabled:cursor-wait disabled:opacity-60"
      >
        <Heart
          size={20}
          className={
            isFavorite
              ? "fill-[#b79a3d] text-[#b79a3d]"
              : "fill-transparent text-[#063f32]"
          }
        />
      </button>
    </article>
  );
}