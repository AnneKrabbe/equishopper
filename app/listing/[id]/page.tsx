"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Header from "@/components/home/Header";
import { HeartIcon as HeartIconOutline } from "@heroicons/react/24/outline";
import { HeartIcon as HeartIconSolid } from "@heroicons/react/24/solid";
import ListingCarousel from "@/components/home/ListingCarousel";

type Listing = {
  id: string;
  title: string;
  price: number;
  brand: string | null;
  size: string | null;
  color: string | null;
  condition: string | null;
  location: string | null;
  main_category: string | null;
  subcategory: string | null;
  shipping_available: boolean | null;
  receipt: boolean | null;
  description: string | null;
  view_count: number | null;
  seller_id: string | null;
  favorite_count: number | null;
  is_we_love: boolean | null;
  listing_images?: {
    image_url: string;
    sort_order: number;
  }[];
};

export default function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [listing, setListing] = useState<Listing | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [relatedListings, setRelatedListings] = useState<Listing[]>([]);
const [sellerListings, setSellerListings] = useState<Listing[]>([]);

useEffect(() => {
  async function fetchListing() {
    await supabase.rpc("increment_listing_view_count", {
      listing_id_input: id,
    });

    const { data, error } = await supabase
      .from("listings")
      .select(`
        id,
        seller_id,
        favorite_count,
        title,
        price,
        brand,
        size,
        color,
        condition,
        location,
        main_category,
        subcategory,
        shipping_available,
        receipt,
        description,
        view_count,
        is_we_love,
        listing_images (
          image_url,
          sort_order
        )
      `)
      .eq("id", id)
      .single();

      console.log("Listing data:", data);
console.log("Listing error:", error);

    if (error) {
      console.log("Fejl ved hentning af annonce:", error);
      return;
    }

    if (!data) return;

    console.log("Vi kom hertil");
    setListing(data as Listing);

    const { data: related } = await supabase
      .from("listings")
      .select(`
        id,
        seller_id,
        favorite_count,
        title,
        price,
        brand,
        size,
        is_we_love,
        listing_images (
          image_url,
          sort_order
        )
      `)
      .eq("main_category", data.main_category)
      .neq("id", data.id)
      .order("favorite_count", { ascending: false })
      .limit(12);

    if (related) {
      setRelatedListings(related as Listing[]);
    }

if (data.seller_id) {

  const { data: sellerItems } = await supabase
    .from("listings")
    .select(`
      id,
      seller_id,
      favorite_count,
      title,
      price,
      brand,
      size,
      is_we_love,
      listing_images (
        image_url,
        sort_order
      )
    `)
    .eq("seller_id", data.seller_id)
    .neq("id", data.id)
    .order("created_at", { ascending: false })
    .limit(12);

  if (sellerItems) {
    setSellerListings(sellerItems as Listing[]);
  }
}

    const { data: userData } = await supabase.auth.getUser();

    if (userData.user) {
      const { data: favoriteData } = await supabase
        .from("favorites")
        .select("id")
        .eq("seller_id", userData.user.id)
        .eq("listing_id", id)
        .maybeSingle();

      setIsFavorite(!!favoriteData);
    }
  }

  fetchListing();
}, [id]);


  if (!listing) {
    return (
      <main className="min-h-screen bg-[#f8f6f1]">
        <Header />
        <div className="mx-auto max-w-7xl px-6 pt-32">
          <p className="text-[#063f32]">Indlæser annonce...</p>
        </div>
      </main>
    );
  }

  const images =
    listing.listing_images?.sort((a, b) => a.sort_order - b.sort_order) || [];

  async function toggleFavorite() {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user || !listing) {
      alert("Du skal være logget ind for at gemme favoritter.");
      return;
    }

    if (isFavorite) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("seller_id", userData.user.id)
        .eq("listing_id", listing.id);

      if (error) {
        alert("Fejl ved fjern favorit: " + error.message);
        return;
      }

      await supabase.rpc("decrement_favorite_count", {
        listing_id_input: listing.id,
      });

      setIsFavorite(false);
    } else {
      const { error } = await supabase.from("favorites").insert({
        seller_id: userData.user.id,
        listing_id: listing.id,
      });

      if (error) {
        alert("Fejl ved favorit: " + error.message);
        return;
      }

      await supabase.rpc("increment_favorite_count", {
        listing_id_input: listing.id,
      });

      setIsFavorite(true);
    }
  }

  const details = [
    ["Mærke", listing.brand],
    ["Størrelse", listing.size],
    ["Farve", listing.color],
    ["Stand", listing.condition],
    ["Lokation", listing.location],
    ["Kategori", [listing.main_category, listing.subcategory].filter(Boolean).join(" · ")],
    ["Fragt muligt", listing.shipping_available ? "Ja" : "Nej"],
    ["Kvittering", listing.receipt ? "Ja" : "Nej"],
  ];

  return (
    <main className="min-h-screen bg-[#f8f6f1]">
      <Header />

      <div className="mx-auto max-w-7xl px-4 pb-20 pt-28 md:px-8 md:pt-36">
        <div className="mb-8 text-sm text-stone-500">
          <Link href="/" className="hover:text-[#063f32]">
            Forside
          </Link>
          <span className="mx-2">/</span>
          <span>{listing.title}</span>
        </div>

       <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
 
 {/* VENSTRE KOLONNE */}
<div>
  <section>
    <div className="relative overflow-hidden rounded-[32px] bg-[#f1ece2] shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
      {listing.is_we_love && (
        <div className="absolute left-5 top-5 z-10 rounded-full bg-[#d4af37] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#063f32]">
          We Love
        </div>
      )}

      <button
        type="button"
        onClick={toggleFavorite}
        aria-label="Gem favorit"
        className="absolute right-5 top-5 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-[#d4af37] shadow-sm transition hover:bg-white"
      >
        {isFavorite ? (
          <HeartIconSolid className="h-7 w-7" />
        ) : (
          <HeartIconOutline className="h-7 w-7" />
        )}
      </button>

      {images[activeImage] ? (
        <img
          src={images[activeImage].image_url}
          alt={listing.title}
          className="h-[430px] w-full object-cover md:h-[620px]"
        />
      ) : (
        <div className="flex h-[430px] items-center justify-center md:h-[620px]">
          <img
            src="/images/equishopper-grey-logo.png"
            alt=""
            className="h-32 opacity-40"
          />
        </div>
      )}

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={() =>
              setActiveImage((prev) =>
                prev === 0 ? images.length - 1 : prev - 1
              )
            }
            aria-label="Forrige billede"
            className="absolute left-5 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#063f32] shadow-sm transition hover:bg-white"
          >
            ←
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveImage((prev) =>
                prev === images.length - 1 ? 0 : prev + 1
              )
            }
            aria-label="Næste billede"
            className="absolute right-5 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#063f32] shadow-sm transition hover:bg-white"
          >
            →
          </button>

          <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-2 rounded-full bg-black/25 px-3 py-2 backdrop-blur-sm">
            {images.map((image, index) => (
              <button
                key={image.image_url}
                type="button"
                onClick={() => setActiveImage(index)}
                aria-label={`Vis billede ${index + 1}`}
                className={`h-2 w-2 rounded-full transition ${
                  activeImage === index ? "bg-[#d4af37]" : "bg-white/70"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>

    {images.length > 1 && (
      <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
        {images.map((image, index) => (
          <button
            key={image.image_url}
            type="button"
            onClick={() => setActiveImage(index)}
            className={`h-24 w-24 flex-none overflow-hidden rounded-2xl border transition ${
              activeImage === index
                ? "border-[#d4af37]"
                : "border-transparent"
            }`}
          >
            <img
              src={image.image_url}
              alt=""
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>
    )}
  </section>

    <section className="mt-8 rounded-[32px] border border-[#eadfcb] bg-[#fbfaf7] p-8 shadow-[0_18px_45px_rgba(0,0,0,0.05)]">
      <h2 className="mb-5 font-serif text-3xl text-[#063f32]">
        Beskrivelse
      </h2>

      <p className="whitespace-pre-wrap text-[17px] leading-8 text-stone-700">
        {listing.description || "Ingen beskrivelse."}
      </p>
    </section>
  </div>

  {/* HØJRE KOLONNE */}
  <aside className="self-start">
    <div className="rounded-[32px] border border-[#eadfcb] bg-[#fbfaf7] p-7 shadow-[0_18px_45px_rgba(0,0,0,0.06)] md:p-9">
      <h1 className="font-serif text-5xl leading-tight text-[#063f32]">
        {listing.title}
      </h1>

      {listing.subcategory && (
        <p className="mt-3 text-lg text-[#063f32]">
          {listing.subcategory}
        </p>
      )}

      <p className="mt-8 text-4xl font-semibold text-black">
        {listing.price.toLocaleString("da-DK")} kr.
      </p>

      <div className="my-8 grid gap-4 border-y border-[#eadfcb] py-6 text-[17px]">
        {details.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-6">
            <span className="text-stone-500">{label}</span>
            <span className="text-right font-semibold text-[#063f32]">
              {value || "-"}
            </span>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <button className="w-full rounded-full bg-[#063f32] px-6 py-4 font-medium text-white transition hover:bg-[#052f26]">
          Kontakt sælger
        </button>

        <button className="w-full rounded-full border border-[#d4af37] px-6 py-4 font-medium text-[#063f32] transition hover:bg-[#f4ead0]">
          Send bud
        </button>
      </div>

      <div className="mt-8 rounded-[24px] border border-[#eadfcb] bg-white p-5 shadow-sm">
        <p className="text-xs uppercase tracking-[0.25em] text-[#b79a3d]">
          Sælger
        </p>

        <div className="mt-4 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#063f32] text-lg font-semibold text-[#d4af37]">
            S
          </div>

          <div>
            <p className="font-serif text-2xl text-[#063f32]">
              Sælger
            </p>
            <p className="text-[17px] text-stone-500">
              Privat sælger
            </p>
          </div>
        </div>

       <div className="mt-6 space-y-4 border-t border-[#eadfcb] pt-5 text-[17px]">
          <div className="flex justify-between gap-4">
            <span className="text-[17px]text-stone-500">Lokation</span>
            <span className="text-right text-[17px] font-semibold text-[#063f32]">
              {listing.location || "-"}
            </span>
          </div>

          <div className="flex justify-between gap-4">
            <span className="text-[17px] text-stone-500">Afstand</span>
            <span className="text-right text-[17px] font-semibold text-[#063f32]">
              Beregnes senere
            </span>
          </div>

          <div className="flex justify-between gap-4">
  <span className="text-[17px] text-stone-500">Anmeldelser</span>
  <span className="text-right text-[17px] font-semibold text-[#063f32]">
    ★ Ny sælger
  </span>
</div>

<div className="flex justify-between gap-4">
  <span className="text-stone-500">Handler</span>
  <span className="text-right text-[17px] font-semibold text-[#063f32]">
    0 gennemførte
  </span>
</div>
        </div>

        <button className="mt-5 w-full rounded-full border border-[#d4af37] px-5 py-3 text-sm font-medium text-[#063f32] transition hover:bg-[#f4ead0]">
          Se sælgers profil
        </button>
      </div>

      <div className="mt-8 rounded-[24px] bg-white p-5 shadow-sm">
        <p className="text-xs uppercase tracking-[0.25em] text-[#b79a3d]">
          Tryg handel
        </p>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          Pengene holdes sikkert, indtil varen er modtaget. Chat med sælger
          og aftal fragt direkte i Equishopper.
        </p>
      </div>
    </div>
  </aside>
</div>

        </div>

{relatedListings.length > 0 && (
  <section className="mx-auto mt-20 max-w-7xl px-4 md:px-8">
    <ListingCarousel
      title="Flere annoncer til dig"
      href={`/category/${listing.main_category}`}
      listings={relatedListings}
      favorites={isFavorite ? [listing.id] : []}
      toggleFavorite={() => {}}
    />
  </section>
)}

{sellerListings.length > 0 && (
  <section className="mx-auto mt-16 max-w-7xl px-4 md:px-8">
    <ListingCarousel
      title="Andre annoncer fra sælger"
      href="#"
      listings={sellerListings}
      favorites={[]}
      toggleFavorite={() => {}}
    />
  </section>
)}

    </main>
  );
}