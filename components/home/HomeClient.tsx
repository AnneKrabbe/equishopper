"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  HeartIcon as HeartIconOutline,
} from "@heroicons/react/24/outline";

import {
  HeartIcon as HeartIconSolid,
} from "@heroicons/react/24/solid";

import {
  BadgeCheck,
  Shield,
  Warehouse,
  Heart,
} from "lucide-react";

import Hero from "@/components/home/Hero";
import ExploreCategories from "@/components/home/ExploreCategories";
import ListingCarousel from "@/components/home/ListingCarousel";

type Listing = {
  id: string;
  title: string;
  price: number;
  brand: string | null;
  size: string | null;
  location: string | null;
  created_at: string;
  trending_score: number | null;
  is_we_love: boolean | null;
  listing_images?: {
    image_url: string;
    sort_order: number;
  }[];
};

export default function HomeClient() {
  const [listings, setListings] = useState<Listing[]>([]);
const [favorites, setFavorites] = useState<string[]>([]);
const [debugMessage, setDebugMessage] = useState("Starter...");

  useEffect(() => {
    async function fetchListings() {

      setDebugMessage("Forbinder til Supabase...");
      const { data, error } = await supabase
        .from("listings")
        .select(`
        id,
        title,
        price,
        brand,
        size,
        location,
        created_at,
        trending_score,
        is_we_love,
        listing_images (
          image_url,
          sort_order
  )
`)
        .order("created_at", { ascending: false });


if (error) {
  console.log("Supabase fejl:", error);
  setDebugMessage("Supabase fejl: " + error.message);
  return;
}

if (data) {
  console.log("Supabase listings:", data.length);
  setDebugMessage("Listings hentet: " + data.length);
  setListings(data as Listing[]);
}
    }

    fetchListings();

    async function fetchFavorites() {
      
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return;
  }

  const { data } = await supabase
    .from("favorites")
    .select("listing_id")
    .eq("user_id", userData.user.id);

  if (data) {
    setFavorites(data.map((item) => item.listing_id));
  }
}

fetchFavorites();
  }, []);

const latestListings = listings.slice(0, 4);

const trendingListings = [...listings]
  .sort((a, b) => (b.trending_score || 0) - (a.trending_score || 0))
  .slice(0, 4);
  const hasTrending = trendingListings.length > 0;

const weLoveListings = listings
  .filter((listing) => listing.is_we_love)
  .slice(0, 4);

console.log("ALLE listings:", listings.length);
console.log("Trending:", trendingListings.length);
console.log("We Love:", weLoveListings.length);
console.log("Nyeste:", latestListings.length);

async function toggleFavorite(listingId: string) {

  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    alert("Du skal være logget ind for at gemme favoritter.");
    return;
  }

  if (favorites.includes(listingId)) {
  await supabase
    .from("favorites")
    .delete()
    .eq("user_id", userData.user.id)
    .eq("listing_id", listingId);

  await supabase.rpc("decrement_favorite_count", {
    listing_id_input: listingId,
  });

  setFavorites((prev) =>
    prev.filter((id) => id !== listingId)
  );
} else {
  await supabase
    .from("favorites")
    .insert({
      user_id: userData.user.id,
      listing_id: listingId,
    });

  await supabase.rpc("increment_favorite_count", {
    listing_id_input: listingId,
  });

  setFavorites((prev) => [...prev, listingId]);
}
}

  return (
  <main className="min-h-screen bg-[#f8f6f1]">
     
<header className="fixed top-0 z-50 w-full bg-[#063f32]/95 backdrop-blur">
  <div className="mx-auto flex h-20 max-w-[1800px] items-center justify-between px-4 md:h-24 md:px-8">
    <Link href="/">
      <img
        src="/images/equishopper-logo.png"
        alt="Equishopper"
        className="h-16 w-16 md:h-24 md:w-24"
      />
    </Link>

    <nav className="hidden gap-10 text-sm uppercase tracking-[0.18em] text-[#d4af37] md:flex">
      <Link href="/">Forside</Link>
      <Link href="/newest">Annoncer</Link>
      <Link href="/category/til-hesten">Kategorier</Link>
      <Link href="/">Nyheder</Link>
    </nav>

    <div className="flex items-center gap-2 md:gap-4">
      <Link
        href="/favorites"
        className="rounded-full border border-[#d4af37] px-4 py-2 text-sm text-white md:px-6"
      >
        Favoritter
      </Link>

      <Link
        href="/login"
        className="rounded-full border border-[#d4af37] px-4 py-2 text-sm text-white md:px-6"
      >
        Log ind
      </Link>

      <Link
        href="/sell"
        className="rounded-full bg-[#d4af37] px-4 py-2 text-sm font-medium text-black md:px-6"
      >
        Opret
      </Link>
    </div>
  </div>
</header>

<Hero />

<ExploreCategories />

<section className="mx-auto max-w-7xl px-4 pb-14 md:px-8 md:pb-20">
  <div className="space-y-12 xl:grid xl:grid-cols-3 xl:gap-8 xl:space-y-0">

<ListingCarousel
  title="🔥 Trending"
  href="/trending"
  listings={trendingListings}
  favorites={favorites}
  toggleFavorite={toggleFavorite}
/>

<ListingCarousel
  title="💚 We Love"
  href="/we-love"
  listings={weLoveListings}
  favorites={favorites}
  toggleFavorite={toggleFavorite}
/>

<ListingCarousel
  title="👀 Nyeste annoncer"
  href="/newest"
  listings={latestListings}
  favorites={favorites}
  toggleFavorite={toggleFavorite}
/>

  </div>
</section>

<section className="mx-auto grid max-w-7xl gap-6 px-8 pb-20 lg:grid-cols-3">
  <div className="rounded-3xl bg-[#0b3b2f] p-8 text-white">
    <p className="mb-4 text-sm uppercase tracking-[0.25em] text-[#d4af37]">
      Shop efter kategori
    </p>
    <h3 className="mb-6 font-serif text-3xl">
      Find præcis det, du leder efter
    </h3>
    <Link
      href="/"
      className="inline-block rounded-full bg-white px-6 py-3 text-sm font-medium text-black"
    >
      Se alle kategorier
    </Link>
  </div>

  <div className="rounded-3xl bg-white p-8 shadow">
    <p className="mb-4 text-sm uppercase tracking-[0.25em] text-[#0b3b2f]">
      Nyheder & guides
    </p>
    <h3 className="mb-6 font-serif text-3xl">
      Inspiration, tips og viden til hest og rytter
    </h3>
    <Link
      href="/"
      className="inline-block rounded-full border border-[#d4af37] px-6 py-3 text-sm font-medium"
    >
      Læs de nyeste artikler
    </Link>
  </div>

  <div className="rounded-3xl bg-[#0b3b2f] p-8 text-white">
    <p className="mb-4 text-sm uppercase tracking-[0.25em] text-[#d4af37]">
      Sikkert og trygt
    </p>
    <h3 className="mb-4 font-serif text-3xl">
      Handel med ro i maven
    </h3>
    <ul className="space-y-2 text-stone-200">
      <li>✓ Verificerede brugere</li>
      <li>✓ Sikker betaling</li>
      <li>✓ Hjælp når du har brug for det</li>
    </ul>
  </div>
</section>
    </main>
  );
}