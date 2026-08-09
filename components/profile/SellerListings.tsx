"use client";

import ListingCard from "@/components/listings/ListingCard";
import { PackageOpen } from "lucide-react";

type SellerListingsProps = {
  listings: any[];
};

export default function SellerListings({
  listings,
}: SellerListingsProps) {
  if (listings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#f4f1e8]">
          <PackageOpen size={26} className="text-[#063f32]" />
        </div>

        <h3 className="text-lg font-semibold text-[#063f32]">
          Ingen aktive annoncer
        </h3>

        <p className="mt-2 text-stone-500">
          Denne sælger har ingen aktive annoncer lige nu.
        </p>
      </div>
    );
  }

  return (
    <div className="-mx-2 overflow-x-auto pb-4">
      <div className="flex w-max items-stretch gap-6 px-2 snap-x snap-mandatory">
        {listings.map((listing) => (
          <div
            key={listing.id}
            className="flex w-[290px] shrink-0 snap-start sm:w-[320px] lg:w-[340px]"
          >
            <div className="w-full [&>*]:h-full [&>*]:w-full">
              <ListingCard listing={listing} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}