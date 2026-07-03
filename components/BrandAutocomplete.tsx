"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function BrandAutocomplete() {
  const [brandOptions, setBrandOptions] = useState<string[]>([]);
  const [brandSearch, setBrandSearch] = useState("");
  const [showBrandSuggestions, setShowBrandSuggestions] = useState(false);

  useEffect(() => {
    async function fetchBrands() {
      const { data, error } = await supabase
        .from("brands")
        .select("name")
        .order("name");

      if (!error && data) {
        setBrandOptions(data.map((item) => item.name));
      }
    }

    fetchBrands();
  }, []);

  return (
    <div className="relative">
      <input
        value={brandSearch}
        onChange={(e) => {
          setBrandSearch(e.target.value);
          setShowBrandSuggestions(true);
        }}
        onFocus={() => setShowBrandSuggestions(true)}
        placeholder="Søg brand..."
        className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none"
      />

      {showBrandSuggestions && (
        <div className="absolute z-30 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-stone-200 bg-white shadow-lg">
          {brandOptions
            .filter((option) =>
              brandSearch
                ? option.toLowerCase().startsWith(brandSearch.toLowerCase())
                : true
            )
            .sort((a, b) => {
              if (a === "Andet") return 1;
              if (b === "Andet") return -1;
              return a.localeCompare(b);
            })
            .map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setBrandSearch(option);
                  setShowBrandSuggestions(false);
                }}
                className="block w-full px-4 py-3 text-left text-sm text-[#063f32] hover:bg-stone-100"
              >
                {option}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}