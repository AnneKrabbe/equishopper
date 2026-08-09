import { supabase } from "@/lib/supabase";
import ListingCard from "@/components/listings/ListingCard";
import FilterSidebar from "@/components/filters/FilterSidebar";
import MobileFilterBar from "@/components/filters/MobileFilterBar";
import Header from "@/components/home/Header";
import Hero from "@/components/home/Hero";
import { Search } from "lucide-react";

type Listing = {
  id: string;
  title: string;
  price: number;
  brand: string | null;
  main_category: string | null;
  subcategory: string | null;
  size: string | null;
  trending_score: number | null;
  listing_images?: {
    image_url: string;
    sort_order: number;
  }[];
};

type ListingsPageProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
    group?: string;
    subcategory?: string;
    size?: string;
    brand?: string;
    condition?: string;
    minPrice?: string;
    maxPrice?: string;
    sort?: string;
  }>;
};

function escapeSearchValue(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("%", "\\%")
    .replaceAll("_", "\\_")
    .replaceAll(",", "\\,");
}

export default async function ListingsPage({
  searchParams,
}: ListingsPageProps) {
  const params = await searchParams;

  const searchQuery = params.q?.trim() || "";
  const categoryName = params.category || "Alle kategorier";
  const subcategory = params.subcategory || "";
  const size = params.size || "";
  const brand = params.brand || "";
  const condition = params.condition?.trim() || "";
  const sort = params.sort || "newest";

  const parsedMinPrice = Number(params.minPrice);
  const parsedMaxPrice = Number(params.maxPrice);

  const minPrice =
    params.minPrice &&
    Number.isFinite(parsedMinPrice) &&
    parsedMinPrice >= 0
      ? parsedMinPrice
      : null;

  const maxPrice =
    params.maxPrice &&
    Number.isFinite(parsedMaxPrice) &&
    parsedMaxPrice >= 0
      ? parsedMaxPrice
      : null;

  let query = supabase
    .from("listings")
    .select(`
      id,
      title,
      price,
      brand,
      main_category,
      subcategory,
      size,
      trending_score,
      listing_images (
        image_url,
        sort_order
      )
    `);

  if (searchQuery) {
    const searchValue = escapeSearchValue(searchQuery);

    query = query.or(
      [
        `title.ilike.%${searchValue}%`,
        `brand.ilike.%${searchValue}%`,
        `main_category.ilike.%${searchValue}%`,
        `subcategory.ilike.%${searchValue}%`,
        `description.ilike.%${searchValue}%`,
      ].join(",")
    );
  }

  if (categoryName !== "Alle kategorier") {
    query = query.eq("main_category", categoryName);
  }

  if (subcategory) {
    query = query.eq("subcategory", subcategory);
  }

  if (size) {
    query = query.eq("size", size);
  }

  if (brand) {
    query = query.eq("brand", brand);
  }

  if (condition) {
    query = query.eq("condition", condition);
  }

  if (minPrice !== null) {
    query = query.gte("price", minPrice);
  }

  if (maxPrice !== null) {
    query = query.lte("price", maxPrice);
  }

  if (sort === "popular") {
    query = query
      .order("trending_score", {
        ascending: false,
        nullsFirst: false,
      })
      .order("created_at", {
        ascending: false,
      });
  } else if (sort === "price-asc") {
    query = query.order("price", {
      ascending: true,
      nullsFirst: false,
    });
  } else if (sort === "price-desc") {
    query = query.order("price", {
      ascending: false,
      nullsFirst: false,
    });
  } else {
    query = query.order("created_at", {
      ascending: false,
    });
  }

  const { data, error } = await query;

  if (error) {
    console.error("Fejl ved hentning af annoncer:", error);
  }

  const listings = (data ?? []) as Listing[];
  const listingsCount = listings.length;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f8f6f1] pb-24 lg:pb-0">
      <Header />

      <Hero
        title="Annoncer"
        description="Find udstyr til hest, rytter og stald."
        image="/images/Astralis.png"
        listingsCount={listingsCount}
        showSearch={false}
      />

      <section className="relative z-20 mx-auto -mt-6 max-w-7xl px-3 pb-12 sm:px-5 lg:-mt-20 lg:px-8 lg:pb-20">
        <div className="rounded-[28px] bg-[#fbfaf7] px-3 py-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)] sm:px-5 lg:rounded-[2.5rem] lg:p-10">
          <form
            action="/annoncer"
            method="get"
            className="mb-8 rounded-[24px] border border-[#eadfcb] bg-white p-3 shadow-sm sm:flex sm:items-center sm:gap-3"
          >
            <div className="flex min-w-0 flex-1 items-center">
              <Search className="ml-3 h-5 w-5 shrink-0 text-stone-400" />

              <input
                type="search"
                name="q"
                defaultValue={searchQuery}
                placeholder="Søg i alle annoncer..."
                className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-[#063f32] outline-none placeholder:text-stone-400"
                aria-label="Søg i annoncer"
              />
            </div>

            {categoryName !== "Alle kategorier" && (
              <input type="hidden" name="category" value={categoryName} />
            )}

            {params.group && (
              <input type="hidden" name="group" value={params.group} />
            )}

            {subcategory && (
              <input type="hidden" name="subcategory" value={subcategory} />
            )}

            {size && <input type="hidden" name="size" value={size} />}

            {brand && <input type="hidden" name="brand" value={brand} />}

            {condition && (
              <input type="hidden" name="condition" value={condition} />
            )}

            {minPrice !== null && (
              <input type="hidden" name="minPrice" value={minPrice} />
            )}

            {maxPrice !== null && (
              <input type="hidden" name="maxPrice" value={maxPrice} />
            )}

            {sort !== "newest" && (
              <input type="hidden" name="sort" value={sort} />
            )}

            <button
              type="submit"
              className="mt-3 w-full rounded-full bg-[#d4af37] px-7 py-3.5 text-sm font-semibold text-[#063f32] transition hover:brightness-95 sm:mt-0 sm:w-auto"
            >
              Søg
            </button>
          </form>

          <div className="grid gap-8 lg:grid-cols-[320px_1fr] lg:gap-12">
            <div className="hidden lg:block">
              <FilterSidebar
                categoryName={categoryName}
                listingsCount={listingsCount}
              />
            </div>

            <div className="min-w-0">
              <div className="mb-5 border-b border-stone-200 pb-5 lg:mb-8 lg:flex lg:items-center lg:justify-between lg:pb-6">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.3em] text-[#d4af37] lg:text-sm lg:tracking-[0.25em]">
                    {searchQuery
                      ? `Søgeresultater for “${searchQuery}”`
                      : categoryName}
                  </div>

                  <h2 className="mt-2 font-serif text-[36px] leading-tight text-[#063f32] lg:text-4xl">
                    {listingsCount} annoncer
                  </h2>
                </div>

                <form className="mt-5 hidden items-center lg:flex">
                  {searchQuery && (
                    <input type="hidden" name="q" value={searchQuery} />
                  )}

                  {categoryName !== "Alle kategorier" && (
                    <input
                      type="hidden"
                      name="category"
                      value={categoryName}
                    />
                  )}

                  {params.group && (
                    <input
                      type="hidden"
                      name="group"
                      value={params.group}
                    />
                  )}

                  {subcategory && (
                    <input
                      type="hidden"
                      name="subcategory"
                      value={subcategory}
                    />
                  )}

                  {size && (
                    <input type="hidden" name="size" value={size} />
                  )}

                  {brand && (
                    <input type="hidden" name="brand" value={brand} />
                  )}

                  {condition && (
                    <input
                      type="hidden"
                      name="condition"
                      value={condition}
                    />
                  )}

                  {minPrice !== null && (
                    <input
                      type="hidden"
                      name="minPrice"
                      value={minPrice}
                    />
                  )}

                  {maxPrice !== null && (
                    <input
                      type="hidden"
                      name="maxPrice"
                      value={maxPrice}
                    />
                  )}

                  <select
                    name="sort"
                    defaultValue={sort}
                    className="rounded-full border border-stone-200 bg-white px-6 py-3 text-sm text-[#063f32] outline-none focus:border-[#d4af37]"
                  >
                    <option value="newest">Nyeste først</option>
                    <option value="popular">Mest populære</option>
                    <option value="price-asc">Pris lav til høj</option>
                    <option value="price-desc">Pris høj til lav</option>
                  </select>

                  <button
                    type="submit"
                    className="ml-2 rounded-full bg-[#063f32] px-5 py-3 text-sm text-white"
                  >
                    Sortér
                  </button>
                </form>
              </div>

              {listingsCount > 0 ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3 lg:gap-5 xl:grid-cols-4">
                  {listings.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-[24px] border border-[#eadfcb] bg-white px-5 py-14 text-center">
                  <h3 className="font-serif text-2xl text-[#063f32]">
                    Ingen annoncer fundet
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-stone-500">
                    {searchQuery
                      ? `Vi fandt ingen annoncer, der matcher “${searchQuery}”. Prøv et andet søgeord eller justér filtrene.`
                      : "Der er ingen annoncer, som matcher det valgte filter."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <MobileFilterBar
        categoryName={categoryName}
        listingsCount={listingsCount}
      />

    </main>
    
  );
}