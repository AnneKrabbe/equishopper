import { supabase } from "@/lib/supabase";
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

  const categoryName = categoryMap[slug] || "Kategori";

  const heroTextMap: Record<
    string,
    {
      description: string;
      image: string;
      imagePosition: string;
    }
  > = {
    "Til hesten": {
      description:
        "Kvalitetsudstyr til din hest. Nemt, sikkert og bæredygtigt.",
      image: "/images/Astralis.png",
      imagePosition: "72% 35%",
    },
    "Til rytteren": {
      description:
        "Eksklusivt rideudstyr og beklædning til rytteren.",
      image: "/images/Astralis.png",
      imagePosition: "72% 35%",
    },
    "Til stalden": {
      description:
        "Praktisk og holdbart udstyr til stalden og folden.",
      image: "/images/Astralis.png",
      imagePosition: "72% 35%",
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
      {/* HERO */}
      <section className="relative bg-[#021511]">
        {/* MOBIL HERO */}
        <div className="relative min-h-[390px] overflow-hidden lg:hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url('${hero.image}')`,
              backgroundPosition: hero.imagePosition,
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-t from-[#021511] via-[#021511]/55 to-[#021511]/10" />

          <div className="relative z-10 flex min-h-[390px] items-end px-5 pb-10 pt-28">
            <div className="max-w-[330px]">
              <p className="mb-3 text-[11px] uppercase tracking-[0.35em] text-[#d4af37]">
                Premium secondhand
              </p>

              <h1 className="font-serif text-[46px] leading-[0.95] text-white">
                {categoryName}
              </h1>

              <p className="mt-4 max-w-[290px] text-[16px] leading-7 text-stone-100">
                {hero.description}
              </p>

              <p className="mt-6 text-sm text-white/85">
                {listingsCount} annoncer fundet
              </p>
            </div>
          </div>
        </div>

        {/* DESKTOP HERO */}
        <div className="mx-auto hidden min-h-[600px] max-w-[1800px] grid-cols-[30%_70%] lg:grid">
          <div className="flex items-center px-10 xl:px-18">
            <div className="max-w-xl">
              <h1 className="font-serif text-6xl text-white xl:text-7xl">
                {categoryName}
              </h1>

              <p className="mt-8 text-xl leading-9 text-stone-200">
                {hero.description}
              </p>

              <div className="mt-12">
                <div className="text-sm uppercase tracking-[0.35em] text-[#d4af37]">
                  {categoryName}
                </div>

                <div className="mt-2 text-xl text-white">
                  {listingsCount} annoncer fundet
                </div>
              </div>
            </div>
          </div>

          <div
            className="relative bg-cover"
            style={{
              backgroundImage: `url('${hero.image}')`,
              backgroundPosition: hero.imagePosition,
              backgroundSize: "cover",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#021511] via-[#021511]/20 to-transparent" />
          </div>
        </div>
      </section>

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

                {/* Kun desktop – mobil bruger MobileFilterBar */}
                <select className="mt-5 hidden rounded-full border border-stone-200 bg-white px-6 py-3 text-sm text-[#063f32] outline-none focus:border-[#d4af37] lg:block">
                  <option>Nyeste først</option>
                  <option>Pris lav til høj</option>
                  <option>Pris høj til lav</option>
                </select>
              </div>

              {listingsCount > 0 ? (
                <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-8">
                  {listings?.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
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