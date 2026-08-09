"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import BrandAutocomplete from "@/components/BrandAutocomplete";
import { supabase } from "@/lib/supabase";
import {
  getAllSubcategories,
  getCategoryGroups,
  getSubcategories,
} from "@/lib/listingCategories";
import { getSizeTypeForSubcategory } from "@/lib/listingSizes";

type FilterSidebarProps = {
  categoryName: string;
  listingsCount: number;
  onClose?: () => void;
};

const categories = [
  "Alle kategorier",
  "Til hesten",
  "Til rytteren",
  "Til stalden",
];
const conditions = [
  "Som ny",
  "Meget god stand",
  "God men brugt",
  "Tydelige brugsspor",
  "Defekt",
];

const MIN_PRICE_LIMIT = 0;
const MAX_PRICE_LIMIT = 50000;

function parsePrice(
  value: string | null,
  fallback: number
): number {
  if (!value) {
    return fallback;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : fallback;
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat("da-DK").format(value);
}

export default function FilterSidebar({
  categoryName,
  listingsCount,
  onClose,
}: FilterSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedGroup = searchParams.get("group") || "";
  const selectedSubcategory =
    searchParams.get("subcategory") || "";
  const selectedSize = searchParams.get("size") || "";
  const selectedCondition =
    searchParams.get("condition") || "";

  const minPriceFromUrl = parsePrice(
    searchParams.get("minPrice"),
    MIN_PRICE_LIMIT
  );

  const maxPriceFromUrl = parsePrice(
    searchParams.get("maxPrice"),
    MAX_PRICE_LIMIT
  );

  const [sizeOptions, setSizeOptions] = useState<string[]>([]);

  const [minPrice, setMinPrice] = useState(
    minPriceFromUrl.toString()
  );

  const [maxPrice, setMaxPrice] = useState(
    maxPriceFromUrl.toString()
  );

  const [priceError, setPriceError] = useState("");

  const groups = getCategoryGroups(categoryName);

  const subcategories =
    categoryName === "Til hesten"
      ? selectedGroup
        ? getSubcategories(categoryName, selectedGroup)
        : getAllSubcategories(categoryName)
      : getAllSubcategories(categoryName);

  useEffect(() => {
    setMinPrice(minPriceFromUrl.toString());
    setMaxPrice(maxPriceFromUrl.toString());
    setPriceError("");
  }, [minPriceFromUrl, maxPriceFromUrl]);

  useEffect(() => {
    let isCancelled = false;

    async function fetchSizes() {
      if (!selectedSubcategory) {
        setSizeOptions([]);
        return;
      }

      if (selectedSubcategory === "Piske") {
        setSizeOptions([]);
        return;
      }

      const sizeType =
        getSizeTypeForSubcategory(selectedSubcategory);

      if (!sizeType) {
        setSizeOptions([]);
        return;
      }

      const { data, error } = await supabase
        .from("sizes")
        .select("name")
        .eq("type", sizeType)
        .order("sort_order");

      if (isCancelled) {
        return;
      }

      if (error) {
        console.error("Kunne ikke hente størrelser:", error);
        setSizeOptions([]);
        return;
      }

      setSizeOptions(
        data?.map((item) => item.name).filter(Boolean) ?? []
      );
    }

    fetchSizes();

    return () => {
      isCancelled = true;
    };
  }, [selectedSubcategory]);

  function navigateWithParams(params: URLSearchParams) {
    const queryString = params.toString();

    router.push(
      queryString ? `/annoncer?${queryString}` : "/annoncer"
    );
  }

  function updateCategory(value: string) {
    const params = new URLSearchParams(
      searchParams.toString()
    );

    params.delete("group");
    params.delete("subcategory");
    params.delete("size");

    if (value === "Alle kategorier") {
      params.delete("category");
    } else {
      params.set("category", value);
    }

    navigateWithParams(params);
  }

  function updateGroup(value: string) {
    const params = new URLSearchParams(
      searchParams.toString()
    );

    params.delete("subcategory");
    params.delete("size");

    if (value) {
      params.set("group", value);
    } else {
      params.delete("group");
    }

    navigateWithParams(params);
  }

  function updateSubcategory(value: string) {
    const params = new URLSearchParams(
      searchParams.toString()
    );

    params.delete("size");

    if (value) {
      params.set("subcategory", value);
    } else {
      params.delete("subcategory");
    }

    navigateWithParams(params);
  }

  function updateSize(value: string) {
    const params = new URLSearchParams(
      searchParams.toString()
    );

    if (value) {
      params.set("size", value);
    } else {
      params.delete("size");
    }

    navigateWithParams(params);
  }

  function updateCondition(value: string) {
    const params = new URLSearchParams(
      searchParams.toString()
    );

    if (value) {
      params.set("condition", value);
    } else {
      params.delete("condition");
    }

    navigateWithParams(params);
  }

  function updateSort(value: string) {
    const params = new URLSearchParams(
      searchParams.toString()
    );

    if (value === "newest") {
      params.delete("sort");
    } else {
      params.set("sort", value);
    }

    navigateWithParams(params);
  }

  function applyPriceFilter() {
    const parsedMinPrice =
      minPrice.trim() === ""
        ? MIN_PRICE_LIMIT
        : Number(minPrice);

    const parsedMaxPrice =
      maxPrice.trim() === ""
        ? MAX_PRICE_LIMIT
        : Number(maxPrice);

    if (
      !Number.isFinite(parsedMinPrice) ||
      !Number.isFinite(parsedMaxPrice)
    ) {
      setPriceError("Indtast gyldige priser.");
      return;
    }

    if (
      parsedMinPrice < MIN_PRICE_LIMIT ||
      parsedMaxPrice > MAX_PRICE_LIMIT
    ) {
      setPriceError(
        `Prisen skal være mellem ${formatPrice(
          MIN_PRICE_LIMIT
        )} og ${formatPrice(MAX_PRICE_LIMIT)} kr.`
      );
      return;
    }

    if (parsedMinPrice > parsedMaxPrice) {
      setPriceError(
        "Minimumsprisen må ikke være højere end maksimumsprisen."
      );
      return;
    }

    setPriceError("");

    const params = new URLSearchParams(
      searchParams.toString()
    );

    if (parsedMinPrice > MIN_PRICE_LIMIT) {
      params.set("minPrice", parsedMinPrice.toString());
    } else {
      params.delete("minPrice");
    }

    if (parsedMaxPrice < MAX_PRICE_LIMIT) {
      params.set("maxPrice", parsedMaxPrice.toString());
    } else {
      params.delete("maxPrice");
    }

    navigateWithParams(params);
  }

  function resetPriceFilter() {
    const params = new URLSearchParams(
      searchParams.toString()
    );

    params.delete("minPrice");
    params.delete("maxPrice");

    setMinPrice(MIN_PRICE_LIMIT.toString());
    setMaxPrice(MAX_PRICE_LIMIT.toString());
    setPriceError("");

    navigateWithParams(params);
  }

  function resetFilters() {
    router.push("/annoncer");
  }

  return (
    <aside className="relative z-50 h-fit rounded-[2rem] border border-stone-200 bg-white p-8 lg:sticky lg:top-8">
      <div className="mb-8 flex items-center justify-between">
        <h2 className="font-serif text-3xl text-[#063f32]">
          Filtre
        </h2>

        <button
          type="button"
          onClick={resetFilters}
          className="text-sm text-stone-500 underline"
        >
          Nulstil alle
        </button>
      </div>

      <div className="space-y-8">
        {/* SORTERING */}
        <div className="border-t border-stone-200 pt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#063f32]">
            Sortering
          </p>

          <select
            value={searchParams.get("sort") || "newest"}
            onChange={(event) =>
              updateSort(event.target.value)
            }
            className="w-full rounded-xl border border-stone-200 bg-[#fbfaf7] px-4 py-3 text-sm text-[#063f32] outline-none focus:border-[#d4af37]"
          >
            <option value="newest">Nyeste først</option>
            <option value="popular">Mest populære</option>
            <option value="price-asc">Pris lav til høj</option>
            <option value="price-desc">Pris høj til lav</option>
          </select>
        </div>

        {/* HOVEDKATEGORI */}
        <div className="border-t border-stone-200 pt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#063f32]">
            Kategori
          </p>

          <select
            value={categoryName}
            onChange={(event) =>
              updateCategory(event.target.value)
            }
            className="w-full cursor-pointer rounded-xl border border-stone-200 bg-[#fbfaf7] px-4 py-3 text-sm text-[#063f32] outline-none focus:border-[#d4af37]"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* GRUPPE */}
        {categoryName === "Til hesten" && (
          <div className="border-t border-stone-200 pt-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#063f32]">
              Gruppe
            </p>

            <select
              value={selectedGroup}
              onChange={(event) =>
                updateGroup(event.target.value)
              }
              className="w-full cursor-pointer rounded-xl border border-stone-200 bg-[#fbfaf7] px-4 py-3 text-sm text-[#063f32] outline-none focus:border-[#d4af37]"
            >
              <option value="">Alle grupper</option>

              {groups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* UNDERKATEGORI */}
        <div className="border-t border-stone-200 pt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#063f32]">
            Underkategori
          </p>

          <select
            value={selectedSubcategory}
            onChange={(event) =>
              updateSubcategory(event.target.value)
            }
            disabled={
              categoryName === "Alle kategorier" ||
              subcategories.length === 0
            }
            className="w-full cursor-pointer rounded-xl border border-stone-200 bg-[#fbfaf7] px-4 py-3 text-sm text-[#063f32] outline-none focus:border-[#d4af37] disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400"
          >
            <option value="">
              {categoryName === "Alle kategorier"
                ? "Vælg først kategori"
                : "Alle underkategorier"}
            </option>

            {subcategories
              .slice()
              .sort((a, b) => a.localeCompare(b, "da"))
              .map((subcategory) => (
                <option
                  key={subcategory}
                  value={subcategory}
                >
                  {subcategory}
                </option>
              ))}
          </select>
        </div>

        {/* BRAND */}
        <div className="border-t border-stone-200 pt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#063f32]">
            Brand
          </p>

          <BrandAutocomplete />
        </div>

        {/* PRIS */}
        <div className="border-t border-stone-200 pt-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#063f32]">
              Pris
            </p>

            {(minPriceFromUrl > MIN_PRICE_LIMIT ||
              maxPriceFromUrl < MAX_PRICE_LIMIT) && (
              <button
                type="button"
                onClick={resetPriceFilter}
                className="text-xs text-stone-500 underline"
              >
                Nulstil pris
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-2 block text-xs text-stone-500">
                Minimum
              </span>

              <div className="relative">
                <input
                  type="number"
                  min={MIN_PRICE_LIMIT}
                  max={MAX_PRICE_LIMIT}
                  step="1"
                  inputMode="numeric"
                  value={minPrice}
                  onChange={(event) => {
                    setMinPrice(event.target.value);
                    setPriceError("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      applyPriceFilter();
                    }
                  }}
                  className="w-full rounded-xl border border-stone-200 bg-[#fbfaf7] px-3 py-3 pr-8 text-sm text-[#063f32] outline-none focus:border-[#d4af37]"
                />

                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">
                  kr.
                </span>
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs text-stone-500">
                Maksimum
              </span>

              <div className="relative">
                <input
                  type="number"
                  min={MIN_PRICE_LIMIT}
                  max={MAX_PRICE_LIMIT}
                  step="1"
                  inputMode="numeric"
                  value={maxPrice}
                  onChange={(event) => {
                    setMaxPrice(event.target.value);
                    setPriceError("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      applyPriceFilter();
                    }
                  }}
                  className="w-full rounded-xl border border-stone-200 bg-[#fbfaf7] px-3 py-3 pr-8 text-sm text-[#063f32] outline-none focus:border-[#d4af37]"
                />

                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">
                  kr.
                </span>
              </div>
            </label>
          </div>

          {priceError && (
            <p className="mt-3 text-xs leading-5 text-red-600">
              {priceError}
            </p>
          )}

          <button
            type="button"
            onClick={applyPriceFilter}
            className="mt-4 w-full rounded-xl border border-[#063f32] px-4 py-3 text-sm font-medium text-[#063f32] transition hover:bg-[#063f32] hover:text-white"
          >
            Anvend pris
          </button>
        </div>

        {/* AFSTAND */}
        <div className="border-t border-stone-200 pt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#063f32]">
            Afstand
          </p>

          <input
            placeholder="Postnummer"
            className="mb-3 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none"
          />

          <button
            type="button"
            className="flex w-full items-center justify-between rounded-xl border border-stone-200 bg-[#fbfaf7] px-4 py-3 text-left text-sm"
          >
            <span>Maks. afstand</span>
            <span className="text-[#d4af37]">⌄</span>
          </button>
        </div>

        {/* STAND */}
        <div className="border-t border-stone-200 pt-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#063f32]">
              Stand
            </p>

            {selectedCondition && (
              <button
                type="button"
                onClick={() => updateCondition("")}
                className="text-xs text-stone-500 underline"
              >
                Nulstil stand
              </button>
            )}
          </div>

          <div className="space-y-3 text-sm text-[#063f32]">
            {conditions.map((condition) => (
              <label
                key={condition}
                className="flex cursor-pointer items-center gap-3"
              >
                <input
                  type="radio"
                  name="condition"
                  value={condition}
                  checked={selectedCondition === condition}
                  onChange={() => updateCondition(condition)}
                  className="h-4 w-4 accent-[#063f32]"
                />

                <span>{condition}</span>
              </label>
            ))}
          </div>
        </div>

        {/* STØRRELSE */}
        {selectedSubcategory &&
          selectedSubcategory !== "Piske" &&
          sizeOptions.length > 0 && (
            <div className="border-t border-stone-200 pt-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#063f32]">
                Størrelse
              </p>

              <select
                value={selectedSize}
                onChange={(event) =>
                  updateSize(event.target.value)
                }
                className="w-full cursor-pointer rounded-xl border border-stone-200 bg-[#fbfaf7] px-4 py-3 text-sm text-[#063f32] outline-none focus:border-[#d4af37]"
              >
                <option value="">Alle størrelser</option>

                {sizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          )}

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl bg-[#063f32] px-5 py-4 text-sm font-medium text-white"
        >
          Vis {listingsCount} annoncer
        </button>
      </div>
    </aside>
  );
}