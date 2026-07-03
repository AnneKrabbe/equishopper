"use client";

import Link from "next/link";
import { HeartIcon as HeartIconOutline } from "@heroicons/react/24/outline";
import { HeartIcon as HeartIconSolid } from "@heroicons/react/24/solid";

type Listing = {
  id: string;
  title: string;
  price: number;
  brand: string | null;
  size: string | null;
  is_we_love: boolean | null;
  listing_images?: {
    image_url: string;
    sort_order: number;
  }[];
};

type Props = {
  title: string;
  href: string;
  listings: Listing[];
  favorites: string[];
  toggleFavorite: (id: string) => void;
};

export default function ListingCarousel({
  title,
  href,
  listings,
  favorites,
  toggleFavorite,
}: Props) {
  return (
    <section className="w-full">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-2xl font-bold text-[#171717]">{title}</h3>

        <Link href={href} className="text-sm text-[#063f32]">
          Se alle →
        </Link>
      </div>

      <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-5 xl:mx-0 xl:grid xl:grid-cols-2 xl:px-0">
        {listings.map((listing) => {
          const firstImage = listing.listing_images
            ? [...listing.listing_images].sort(
                (a, b) => a.sort_order - b.sort_order
              )[0]
            : null;

          const isFavorite = favorites.includes(listing.id);

          return (
            <article
              key={listing.id}
              className="relative w-[72vw] max-w-[270px] flex-none overflow-hidden rounded-[28px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)] xl:w-auto xl:max-w-none"
            >
              {listing.is_we_love && (
                <div className="absolute left-3 top-3 z-10 rounded-full bg-[#4f7c59] px-3 py-1 text-xs text-white">
                  We Love
                </div>
              )}

              <button
                type="button"
                onClick={() => toggleFavorite(listing.id)}
                className="absolute right-3 top-3 z-20 rounded-full bg-white/90 p-1 shadow-sm"
              >
                {isFavorite ? (
                  <HeartIconSolid className="h-6 w-6 text-[#d4af37]" />
                ) : (
                  <HeartIconOutline className="h-6 w-6 text-[#d4af37]" />
                )}
              </button>

              <Link href={`/listing/${listing.id}`} className="block">
                {firstImage ? (
                  <img
                    src={firstImage.image_url}
                    alt={listing.title}
                    className="h-56 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-56 items-center justify-center bg-stone-100">
                    <img
                      src="/images/equishopper-grey-logo.png"
                      className="h-28 opacity-50"
                      alt=""
                    />
                  </div>
                )}

                <div className="p-5">
                  {listing.brand && (
                    <p className="text-xs uppercase tracking-[0.18em] text-stone-400">
                      {listing.brand}
                    </p>
                  )}

                  <h4 className="mt-2 line-clamp-2 text-[15px] font-medium text-[#063f32]">
                    {listing.title}
                  </h4>

                  <div className="mt-3 flex items-center justify-between">
                    <p className="font-semibold text-[#063f32]">
                      {listing.price} kr.
                    </p>

                    {listing.size && (
                      <p className="text-xs text-stone-500">
                        Str. {listing.size}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}