"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
  fallback: number,
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

const fieldClass =
  "w-full rounded-xl border border-[#cfc8bc] bg-white px-4 py-3 text-sm font-medium text-[#063f32] shadow-sm outline-none transition placeholder:text-[#77736c] focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 disabled:cursor-not-allowed disabled:bg-[#f1eee8] disabled:text-[#77736c]";

export default function FilterSidebar({
  categoryName,
  listingsCount,
  onClose,
}: FilterSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  /*
   * URL-parametrene er de filtre, der allerede er anvendt.
   * Alle felterne nedenfor er derimod lokale "kladde"-filtre.
   * Derfor loader annonceoversigten først igen, når brugeren
   * trykker "Vis annoncer".
   */
  const [draftCategory, setDraftCategory] = useState(
    categoryName || "Alle kategorier",
  );
  const [draftGroup, setDraftGroup] = useState(
    searchParams.get("group") || "",
  );
  const [draftSubcategory, setDraftSubcategory] = useState(
    searchParams.get("subcategory") || "",
  );
  const [draftSize, setDraftSize] = useState(
    searchParams.get("size") || "",
  );
  const [draftBrand, setDraftBrand] = useState(
    searchParams.get("brand") || "",
  );
  const [draftCondition, setDraftCondition] = useState(
    searchParams.get("condition") || "",
  );
  const [draftSort, setDraftSort] = useState(
    searchParams.get("sort") || "newest",
  );

  const [minPrice, setMinPrice] = useState(
    parsePrice(
      searchParams.get("minPrice"),
      MIN_PRICE_LIMIT,
    ).toString(),
  );
  const [maxPrice, setMaxPrice] = useState(
    parsePrice(
      searchParams.get("maxPrice"),
      MAX_PRICE_LIMIT,
    ).toString(),
  );

  /*
   * Afstand er endnu ikke koblet til serverfiltreringen.
   * Vi beholder felterne visuelt, men uden at udløse navigation.
   */
  const [postalCode, setPostalCode] = useState("");
  const [maxDistance, setMaxDistance] = useState("");

  const [sizeOptions, setSizeOptions] = useState<string[]>([]);
  const [brandOptions, setBrandOptions] = useState<string[]>([]);
  const [priceError, setPriceError] = useState("");

  const groups = useMemo(
    () => getCategoryGroups(draftCategory),
    [draftCategory],
  );

  const subcategories = useMemo(() => {
    if (draftCategory === "Til hesten") {
      return draftGroup
        ? getSubcategories(draftCategory, draftGroup)
        : getAllSubcategories(draftCategory);
    }

    return getAllSubcategories(draftCategory);
  }, [draftCategory, draftGroup]);

  /*
   * Hvis URL'en ændrer sig efter et faktisk submit,
   * synkroniserer vi formularens kladde med de anvendte filtre.
   */
  useEffect(() => {
    setDraftCategory(
      searchParams.get("category") || "Alle kategorier",
    );
    setDraftGroup(searchParams.get("group") || "");
    setDraftSubcategory(
      searchParams.get("subcategory") || "",
    );
    setDraftSize(searchParams.get("size") || "");
    setDraftBrand(searchParams.get("brand") || "");
    setDraftCondition(
      searchParams.get("condition") || "",
    );
    setDraftSort(searchParams.get("sort") || "newest");
    setMinPrice(
      parsePrice(
        searchParams.get("minPrice"),
        MIN_PRICE_LIMIT,
      ).toString(),
    );
    setMaxPrice(
      parsePrice(
        searchParams.get("maxPrice"),
        MAX_PRICE_LIMIT,
      ).toString(),
    );
    setPriceError("");
  }, [searchParams]);

  /*
   * Hent brands til datalist. Det giver autocomplete uden at
   * Brand-feltet selv ændrer URL'en eller refresher siden.
   */
  useEffect(() => {
    let cancelled = false;

    async function fetchBrands() {
      const { data, error } = await supabase
        .from("brands")
        .select("name")
        .order("name");

      if (cancelled) return;

      if (error) {
        console.error("Kunne ikke hente brands:", error);
        setBrandOptions([]);
        return;
      }

      const names = (data ?? [])
        .map((item) => item.name)
        .filter(
          (name): name is string =>
            typeof name === "string" && name.trim().length > 0,
        );

      setBrandOptions(names);
    }

    void fetchBrands();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function fetchSizes() {
      if (
        !draftSubcategory ||
        draftSubcategory === "Piske"
      ) {
        setSizeOptions([]);
        return;
      }

      const sizeType =
        getSizeTypeForSubcategory(draftSubcategory);

      if (!sizeType) {
        setSizeOptions([]);
        return;
      }

      const { data, error } = await supabase
        .from("sizes")
        .select("name")
        .eq("type", sizeType)
        .order("sort_order");

      if (isCancelled) return;

      if (error) {
        console.error("Kunne ikke hente størrelser:", error);
        setSizeOptions([]);
        return;
      }

      setSizeOptions(
        data?.map((item) => item.name).filter(Boolean) ?? [],
      );
    }

    void fetchSizes();

    return () => {
      isCancelled = true;
    };
  }, [draftSubcategory]);

  function handleCategoryChange(value: string) {
    setDraftCategory(value);
    setDraftGroup("");
    setDraftSubcategory("");
    setDraftSize("");
  }

  function handleGroupChange(value: string) {
    setDraftGroup(value);
    setDraftSubcategory("");
    setDraftSize("");
  }

  function handleSubcategoryChange(value: string) {
    setDraftSubcategory(value);
    setDraftSize("");
  }

  function validatePrices() {
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
      return null;
    }

    if (
      parsedMinPrice < MIN_PRICE_LIMIT ||
      parsedMaxPrice > MAX_PRICE_LIMIT
    ) {
      setPriceError(
        `Prisen skal være mellem ${formatPrice(
          MIN_PRICE_LIMIT,
        )} og ${formatPrice(MAX_PRICE_LIMIT)} kr.`,
      );
      return null;
    }

    if (parsedMinPrice > parsedMaxPrice) {
      setPriceError(
        "Minimumsprisen må ikke være højere end maksimumsprisen.",
      );
      return null;
    }

    setPriceError("");

    return {
      min: parsedMinPrice,
      max: parsedMaxPrice,
    };
  }

  function applyFilters() {
    const prices = validatePrices();

    if (!prices) return;

    /*
     * Bevar søgefeltet q, hvis brugeren allerede har søgt,
     * men byg resten af filterparametrene fra kladden.
     */
    const params = new URLSearchParams();

    const q = searchParams.get("q");
    if (q) {
      params.set("q", q);
    }

    if (draftCategory !== "Alle kategorier") {
      params.set("category", draftCategory);
    }

    if (draftGroup) {
      params.set("group", draftGroup);
    }

    if (draftSubcategory) {
      params.set("subcategory", draftSubcategory);
    }

    if (draftSize) {
      params.set("size", draftSize);
    }

    if (draftBrand.trim()) {
      params.set("brand", draftBrand.trim());
    }

    if (draftCondition) {
      params.set("condition", draftCondition);
    }

    if (prices.min > MIN_PRICE_LIMIT) {
      params.set("minPrice", prices.min.toString());
    }

    if (prices.max < MAX_PRICE_LIMIT) {
      params.set("maxPrice", prices.max.toString());
    }

    if (draftSort !== "newest") {
      params.set("sort", draftSort);
    }

    const queryString = params.toString();

    router.push(
      queryString
        ? `/annoncer?${queryString}`
        : "/annoncer",
    );

    onClose?.();
  }

  function resetFilters() {
    setDraftCategory("Alle kategorier");
    setDraftGroup("");
    setDraftSubcategory("");
    setDraftSize("");
    setDraftBrand("");
    setDraftCondition("");
    setDraftSort("newest");
    setMinPrice(MIN_PRICE_LIMIT.toString());
    setMaxPrice(MAX_PRICE_LIMIT.toString());
    setPostalCode("");
    setMaxDistance("");
    setPriceError("");
  }

  return (
    <aside className="relative z-50 h-fit rounded-[2rem] border border-[#ded8ce] bg-white p-6 text-[#063f32] shadow-sm sm:p-8 lg:sticky lg:top-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h2 className="font-serif text-3xl text-[#063f32]">
          Filtre
        </h2>

        <button
          type="button"
          onClick={resetFilters}
          className="text-sm font-medium text-[#55514b] underline decoration-[#d4af37] underline-offset-4 transition hover:text-[#063f32]"
        >
          Nulstil alle
        </button>
      </div>

      <div className="space-y-8">
        {/* SORTERING */}
        <div className="border-t border-[#ded8ce] pt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#063f32]">
            Sortering
          </p>

          <select
            value={draftSort}
            onChange={(event) =>
              setDraftSort(event.target.value)
            }
            className={`${fieldClass} cursor-pointer`}
          >
            <option value="newest">Nyeste først</option>
            <option value="popular">Mest populære</option>
            <option value="price-asc">Pris lav til høj</option>
            <option value="price-desc">Pris høj til lav</option>
          </select>
        </div>

        {/* HOVEDKATEGORI */}
        <div className="border-t border-[#ded8ce] pt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#063f32]">
            Kategori
          </p>

          <select
            value={draftCategory}
            onChange={(event) =>
              handleCategoryChange(event.target.value)
            }
            className={`${fieldClass} cursor-pointer`}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* GRUPPE */}
        {draftCategory === "Til hesten" && (
          <div className="border-t border-[#ded8ce] pt-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#063f32]">
              Gruppe
            </p>

            <select
              value={draftGroup}
              onChange={(event) =>
                handleGroupChange(event.target.value)
              }
              className={`${fieldClass} cursor-pointer`}
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
        <div className="border-t border-[#ded8ce] pt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#063f32]">
            Underkategori
          </p>

          <select
            value={draftSubcategory}
            onChange={(event) =>
              handleSubcategoryChange(event.target.value)
            }
            disabled={
              draftCategory === "Alle kategorier" ||
              subcategories.length === 0
            }
            className={`${fieldClass} cursor-pointer`}
          >
            <option value="">
              {draftCategory === "Alle kategorier"
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
        <div className="border-t border-[#ded8ce] pt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#063f32]">
            Brand
          </p>

          <input
            type="text"
            list="equishopper-brand-options"
            value={draftBrand}
            onChange={(event) =>
              setDraftBrand(event.target.value)
            }
            placeholder="Alle brands"
            autoComplete="off"
            className={fieldClass}
          />

          <datalist id="equishopper-brand-options">
            {brandOptions.map((brand) => (
              <option key={brand} value={brand} />
            ))}
          </datalist>
        </div>

        {/* PRIS */}
        <div className="border-t border-[#ded8ce] pt-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-[#063f32]">
            Pris
          </p>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-2 block text-xs font-medium text-[#55514b]">
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
                  className={`${fieldClass} pr-9`}
                />

                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[#55514b]">
                  kr.
                </span>
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-medium text-[#55514b]">
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
                  className={`${fieldClass} pr-9`}
                />

                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[#55514b]">
                  kr.
                </span>
              </div>
            </label>
          </div>

          {priceError && (
            <p className="mt-3 text-xs font-medium leading-5 text-red-700">
              {priceError}
            </p>
          )}
        </div>

        {/* AFSTAND */}
        <div className="border-t border-[#ded8ce] pt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#063f32]">
            Afstand
          </p>

          <input
            value={postalCode}
            onChange={(event) =>
              setPostalCode(event.target.value)
            }
            inputMode="numeric"
            placeholder="Postnummer"
            className={`${fieldClass} mb-3`}
          />

          <select
            value={maxDistance}
            onChange={(event) =>
              setMaxDistance(event.target.value)
            }
            className={`${fieldClass} cursor-pointer`}
          >
            <option value="">Maks. afstand</option>
            <option value="10">10 km</option>
            <option value="25">25 km</option>
            <option value="50">50 km</option>
            <option value="100">100 km</option>
            <option value="200">200 km</option>
          </select>

          <p className="mt-2 text-xs leading-5 text-[#68635c]">
            Afstandsfilteret bliver koblet til lokationssøgningen separat.
          </p>
        </div>

        {/* STAND */}
        <div className="border-t border-[#ded8ce] pt-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#063f32]">
              Stand
            </p>

            {draftCondition && (
              <button
                type="button"
                onClick={() => setDraftCondition("")}
                className="text-xs font-medium text-[#55514b] underline decoration-[#d4af37] underline-offset-4"
              >
                Nulstil stand
              </button>
            )}
          </div>

          <div className="space-y-3 text-sm font-medium text-[#063f32]">
            {conditions.map((condition) => (
              <label
                key={condition}
                className="flex cursor-pointer items-center gap-3"
              >
                <input
                  type="radio"
                  name="condition"
                  value={condition}
                  checked={draftCondition === condition}
                  onChange={() =>
                    setDraftCondition(condition)
                  }
                  className="h-4 w-4 accent-[#063f32]"
                />

                <span>{condition}</span>
              </label>
            ))}
          </div>
        </div>

        {/* STØRRELSE */}
        {draftSubcategory &&
          draftSubcategory !== "Piske" &&
          sizeOptions.length > 0 && (
            <div className="border-t border-[#ded8ce] pt-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#063f32]">
                Størrelse
              </p>

              <select
                value={draftSize}
                onChange={(event) =>
                  setDraftSize(event.target.value)
                }
                className={`${fieldClass} cursor-pointer`}
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
          onClick={applyFilters}
          className="w-full rounded-xl bg-[#063f32] px-5 py-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#052f26] focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
        >
          Vis annoncer
        </button>

        <p className="text-center text-xs text-[#68635c]">
          Der vises i øjeblikket {listingsCount} annoncer.
        </p>
      </div>
    </aside>
  );
}