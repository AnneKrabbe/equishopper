"use client";

import { useState } from "react";
import FilterSidebar from "@/components/filters/FilterSidebar";

type MobileFilterBarProps = {
  categoryName: string;
  listingsCount: number;
};

export default function MobileFilterBar({
  categoryName,
  listingsCount,
}: MobileFilterBarProps) {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <>
      {showFilters && (
        <div className="fixed inset-0 z-50 bg-black/40 lg:hidden">
          <div className="absolute bottom-0 max-h-[85vh] w-full overflow-y-auto rounded-t-[2rem] bg-[#f8f6f1] p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-3xl text-[#063f32]">
                Filtre
              </h2>

              <button
                onClick={() => setShowFilters(false)}
                className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm"
              >
                Luk
              </button>
            </div>

            <FilterSidebar
              categoryName={categoryName}
              listingsCount={listingsCount}
            />
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 z-40 flex w-full gap-3 border-t border-stone-200 bg-[#fbfaf7]/95 px-4 py-3 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] backdrop-blur lg:hidden">
        <button
          onClick={() => setShowFilters(true)}
          className="flex-1 rounded-full bg-[#063f32] px-5 py-3 text-sm font-medium text-white"
        >
          Filtre
        </button>

        <button className="flex-1 rounded-full border border-[#d4af37] bg-white px-5 py-3 text-sm font-medium text-[#063f32]">
          Sortér
        </button>
      </div>
    </>
  );
}