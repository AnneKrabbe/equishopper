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
        <div
          className="fixed inset-0 z-[10000] bg-black/40 lg:hidden"
          onClick={() => setShowFilters(false)}
        >
          <div
            className="absolute bottom-0 max-h-[90vh] w-full overflow-y-auto rounded-t-[2rem] bg-[#f8f6f1] p-4 pb-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-3xl text-[#063f32]">
                Filtre og sortering
              </h2>

              <button
                type="button"
                onClick={() => setShowFilters(false)}
                className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-[#063f32]"
              >
                Luk
              </button>
            </div>

            <FilterSidebar
              categoryName={categoryName}
              listingsCount={listingsCount}
              onClose={() => setShowFilters(false)}
            />
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 z-40 w-full border-t border-stone-200 bg-[#fbfaf7]/95 px-4 py-3 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setShowFilters(true)}
          className="w-full rounded-full bg-[#063f32] px-5 py-3 text-sm font-medium text-white"
        >
          Filtre og sortering
        </button>
      </div>
    </>
  );
}