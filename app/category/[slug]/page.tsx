import Link from "next/link";
import { supabase } from "@/lib/supabase";
import BrandAutocomplete from "@/components/BrandAutocomplete";
import SubcategoryDropdown from "@/components/SubcategoryDropdown";
import ListingCard from "@/components/listings/ListingCard";
import FilterSidebar from "@/components/filters/FilterSidebar";
import MobileFilterBar from "@/components/filters/MobileFilterBar";

type Listing = {
  id: string;
  title: string;
  price: number;
  brand: string | null;
  main_category: string | null;
  subcategory: string | null;
  listing_images?: {
    image_url: string;
    sort_order: number;
  }[];
};

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const categoryMap: Record<string, string> = {
    "til-hesten": "Til hesten",
    "til-rytteren": "Til rytteren",
    "til-stalden": "Til stalden",
  };

  const categoryName = categoryMap[slug];

  const { data: listings } = await supabase
    .from("listings")
    .select(`
      id,
      title,
      price,
      brand,
      main_category,
      subcategory,
      listing_images (
        image_url,
        sort_order
      )
    `)
    .eq("main_category", categoryName)
    .order("created_at", { ascending: false });

const subcategoryOptions = Array.from(
  new Set(
    listings
      ?.map((listing) => listing.subcategory)
      .filter((subcategory): subcategory is string => Boolean(subcategory))
  )
);

return (
 <main className="min-h-screen bg-[#f8f6f1] pb-24 lg:pb-0">
    <section className="bg-[#021511]">
      <div className="mx-auto grid min-h-[600px] max-w-[1800px] grid-cols-[30%_70%]">
        <div className="flex items-center px-18">
          <div className="max-w-xl">

            <h1 className="font-serif text-7xl text-white">
              {categoryName}
            </h1>

            <p className="mt-8 text-xl leading-9 text-stone-200">
              Kvalitetsudstyr til din hest.
              <br />
              Nemt, sikkert og bæredygtigt.
            </p>

           <div className="mt-12">
  <div className="text-sm uppercase tracking-[0.35em] text-[#d4af37]">
    Til hesten
  </div>

  <div className="mt-2 text-xl font-regular text-white">
    {listings?.length ?? 0} annoncer fundet
  </div>
</div>
          </div>
        </div>

        <div
          className="relative bg-cover"
          style={{
            backgroundImage: "url('/images/Astralis.png')",
            backgroundPosition: "72% 35%",
  backgroundSize: "100%",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#021511] via-[#021511]/20 to-transparent" />
        </div>
      </div>
    </section>

    <section className="relative z-20 mx-auto -mt-20 max-w-7xl px-8 pb-20">

  <div className="rounded-[2.5rem] bg-[#fbfaf7] p-10 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
  <div className="grid gap-8 lg:grid-cols-[320px_1fr] lg:gap-12">

    {/* FILTER */}

<div className="hidden lg:block">
  <FilterSidebar
    categoryName={categoryName}
    listingsCount={listings?.length ?? 0}
  />
</div>

    {/* HØJRE SIDE */}

  <div>

  <div className="mb-8 flex items-center justify-between border-b border-stone-200 pb-6">

    <div>

      <div className="text-sm uppercase tracking-[0.25em] text-[#d4af37]">
        Til hesten
      </div>

     <h2 className="mt-2 font-serif text-4xl text-[#063f32]">
  {listings?.length ?? 0} annoncer
</h2>

    </div>

    <select className="rounded-full border border-stone-200 bg-white px-6 py-3 text-sm text-[#063f32] outline-none">
      <option>Nyeste først</option>
      <option>Pris lav til høj</option>
      <option>Pris høj til lav</option>
    </select>

  </div>

<div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-8">
  {listings?.map((listing) => (
    <ListingCard key={listing.id} listing={listing} />
  ))}
</div>

</div>

    </div>
</div>
</section>

<MobileFilterBar
  categoryName={categoryName}
  listingsCount={listings?.length ?? 0}
/>

  </main>
);
}