"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import { supabase } from "@/lib/supabase";

export default function BrandAutocomplete() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const brandFromUrl = searchParams.get("brand") || "";

  const [brandOptions, setBrandOptions] = useState<string[]>([]);
  const [brandSearch, setBrandSearch] = useState(brandFromUrl);
  const [showBrandSuggestions, setShowBrandSuggestions] =
    useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isCancelled = false;

    async function fetchBrands() {
      const { data, error } = await supabase
        .from("brands")
        .select("name")
        .order("name");

      if (isCancelled) {
        return;
      }

      if (error) {
        console.error("Kunne ikke hente brands:", error);
        setBrandOptions([]);
        return;
      }

      const brands =
        data
          ?.map((item) => item.name)
          .filter(
            (name): name is string =>
              typeof name === "string" && name.length > 0
          ) ?? [];

      setBrandOptions(brands);
    }

    fetchBrands();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    setBrandSearch(brandFromUrl);
  }, [brandFromUrl]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setShowBrandSuggestions(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowBrandSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function updateBrandInUrl(brand: string) {
    const params = new URLSearchParams(searchParams.toString());
    const trimmedBrand = brand.trim();

    if (trimmedBrand) {
      params.set("brand", trimmedBrand);
    } else {
      params.delete("brand");
    }

    const queryString = params.toString();

    router.push(
      queryString
        ? `${pathname}?${queryString}`
        : pathname
    );
  }

  function handleInputChange(newValue: string) {
    setBrandSearch(newValue);
    setShowBrandSuggestions(true);

    if (!newValue.trim()) {
      updateBrandInUrl("");
    }
  }

  function handleBrandSelect(brand: string) {
    setBrandSearch(brand);
    setShowBrandSuggestions(false);
    updateBrandInUrl(brand);
  }

  const filteredBrands = brandOptions
    .filter((option) =>
      option
        .toLocaleLowerCase("da")
        .startsWith(brandSearch.toLocaleLowerCase("da"))
    )
    .sort((a, b) => {
      if (a === "Andet") {
        return 1;
      }

      if (b === "Andet") {
        return -1;
      }

      return a.localeCompare(b, "da");
    });

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={brandSearch}
        onChange={(event) =>
          handleInputChange(event.target.value)
        }
        onFocus={() => setShowBrandSuggestions(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setShowBrandSuggestions(false);
            event.currentTarget.blur();
          }

          if (
            event.key === "Enter" &&
            filteredBrands.length > 0
          ) {
            event.preventDefault();
            handleBrandSelect(filteredBrands[0]);
          }
        }}
        placeholder="Søg brand..."
        autoComplete="off"
        className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#d4af37]"
      />

      {showBrandSuggestions && (
        <div className="absolute z-30 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-stone-200 bg-white shadow-lg">
          {filteredBrands.length > 0 ? (
            filteredBrands.map((option) => (
              <button
                key={option}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  handleBrandSelect(option);
                }}
                className="block w-full px-4 py-3 text-left text-sm text-[#063f32] hover:bg-stone-100"
              >
                {option}
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-stone-500">
              Ingen brands fundet
            </div>
          )}
        </div>
      )}
    </div>
  );
}