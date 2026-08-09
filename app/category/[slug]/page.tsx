import { supabase } from "@/lib/supabase";
import ListingCard from "@/components/listings/ListingCard";
import FilterSidebar from "@/components/filters/FilterSidebar";
import MobileFilterBar from "@/components/filters/MobileFilterBar";
import Header from "@/components/home/Header";
import Hero from "@/components/home/Hero";

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

  const categoryName = categoryMap[slug] || "Kategori";

  const heroTextMap: Record<
    string,
    {
      description: string;
      image: string;
    }
  > = {
    "Til hesten": {
      description:
        "Kvalitetsudstyr til din hest. Nemt, sikkert og bæredygtigt.",
      image: "/images/Astralis.png",
    },
    "Til rytteren": {
      description:
        "Eksklusivt rideudstyr og beklædning til rytteren.",
      image: "/images/Astralis.png",
    },
    "Til stalden": {
      description:
        "Praktisk og holdbart udstyr til stalden og folden.",
      image: "/images/Astralis.png",
    },
  };

  const hero = heroTextMap[categoryName] || heroTextMap["Til hesten"];

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

  const listingsCount = listings?.length ?? 0;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f8f6f1] pb-24 lg:pb-0">
      <Header />

      {/* HERO */}
     <Hero
  title={categoryName}
  description={hero.description}
  image={hero.image}
  listingsCount={listingsCount}
  showSearch={false}
/>

      {/* CONTENT */}
      <section className="relative z-20 mx-auto -mt-6 max-w-7xl px-3 pb-12 sm:px-5 lg:-mt-20 lg:px-8 lg:pb-20">
        <div className="rounded-[28px] bg-[#fbfaf7] px-3 py-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)] sm:px-5 lg:rounded-[2.5rem] lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[320px_1fr] lg:gap-12">
            {/* DESKTOP FILTER */}
            <div className="hidden lg:block">
              <FilterSidebar
                categoryName={categoryName}
                listingsCount={listingsCount}
              />
            </div>

            {/* LISTINGS */}
            <div className="min-w-0">
              <div className="mb-5 border-b border-stone-200 pb-5 lg:mb-8 lg:flex lg:items-center lg:justify-between lg:pb-6">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.3em] text-[#d4af37] lg:text-sm lg:tracking-[0.25em]">
                    {categoryName}
                  </div>

                  <h2 className="mt-2 font-serif text-[36px] leading-tight text-[#063f32] lg:text-4xl">
                    {listingsCount} annoncer
                  </h2>
                </div>

                <select className="mt-5 hidden rounded-full border border-stone-200 bg-white px-6 py-3 text-sm text-[#063f32] outline-none focus:border-[#d4af37] lg:block">
                  <option>Nyeste først</option>
                  <option>Pris lav til høj</option>
                  <option>Pris høj til lav</option>
                </select>
              </div>

              {listingsCount > 0 ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3 lg:gap-5 xl:grid-cols-4">
                  {listings?.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-[24px] border border-[#eadfcb] bg-white px-5 py-14 text-center">
                  <h3 className="font-serif text-2xl text-[#063f32]">
                    Ingen annoncer endnu
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-stone-500">
                    Der er endnu ikke oprettet annoncer i denne kategori.
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