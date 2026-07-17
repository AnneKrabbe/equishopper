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
      <div className="mb-5 flex items-center justify-between px-4 md:px-8 xl:px-0">
        <h3 className="font-serif text-2xl font-normal text-[#063f32] md:text-3xl">
          {title}
        </h3>

        <Link
          href={href}
          className="text-sm font-medium text-[#063f32] transition hover:text-[#b79a3d]"
        >
          Se alle →
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="mx-4 rounded-[28px] border border-[#eadfcb] bg-[#fbfaf7] px-6 py-10 text-center md:mx-8 xl:mx-0">
          <p className="text-sm text-stone-500">
            Der er endnu ingen annoncer her.
          </p>
        </div>
      ) : (
        <div className="flex snap-x gap-4 overflow-x-auto px-4 pb-7 md:gap-5 md:px-8 xl:px-0">
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
                className="group relative w-[72vw] max-w-[300px] flex-none snap-start overflow-hidden rounded-[26px] bg-[#fbfaf7] shadow-[0_12px_34px_rgba(0,0,0,0.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(0,0,0,0.10)] md:w-[260px] xl:w-[245px] 2xl:w-[265px]"
              >
                {listing.is_we_love && (
                  <div className="absolute left-3 top-3 z-10 rounded-full bg-[#d4af37] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#063f32]">
                    We Love
                  </div>
                )}

                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    toggleFavorite(listing.id);
                  }}
                  aria-label="Gem favorit"
                  className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm transition hover:bg-white"
                >
                  {isFavorite ? (
                    <HeartIconSolid className="h-5 w-5 text-[#d4af37]" />
                  ) : (
                    <HeartIconOutline className="h-5 w-5 text-[#d4af37]" />
                  )}
                </button>

                <Link href={`/listing/${listing.id}`} className="block">
                  <div className="relative aspect-[4/5] overflow-hidden bg-[#f1ece2]">
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
                          className="h-24 opacity-35"
                          alt=""
                        />
                      </div>
                    )}
                  </div>

                  <div className="px-4 pb-5 pt-4">
                    {listing.brand && (
                      <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-[#b79a3d]">
                        {listing.brand}
                      </p>
                    )}

                    <h4 className="line-clamp-2 min-h-[40px] text-[15px] font-medium leading-5 text-[#063f32]">
                      {listing.title}
                    </h4>

                    {listing.size && (
                      <p className="mt-1 text-xs text-stone-500">
                        Str. {listing.size}
                      </p>
                    )}

                    <p className="mt-4 text-[15px] font-semibold text-black">
                      {listing.price.toLocaleString("da-DK")} kr.
                    </p>
                  </div>
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}