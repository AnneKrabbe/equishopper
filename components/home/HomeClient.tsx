"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Header from "@/components/home/Header";
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

  useEffect(() => {
    async function fetchListings() {
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
        console.error("Kunne ikke hente annoncer:", error);
        return;
      }

      if (data) {
        setListings(data as Listing[]);
      }
    }

    async function fetchFavorites() {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        return;
      }

      const { data, error } = await supabase
        .from("favorites")
        .select("listing_id")
        .eq("user_id", userData.user.id);

      if (error) {
        console.error("Kunne ikke hente favoritter:", error);
        return;
      }

      if (data) {
        setFavorites(data.map((item) => item.listing_id));
      }
    }

    fetchListings();
    fetchFavorites();
  }, []);

  const latestListings = listings;

  const trendingListings = [...listings].sort(
    (a, b) => (b.trending_score || 0) - (a.trending_score || 0)
  );

  const weLoveListings = listings.filter(
    (listing) => listing.is_we_love
  );

  async function toggleFavorite(listingId: string) {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      alert("Du skal være logget ind for at gemme favoritter.");
      return;
    }

    const isFavorite = favorites.includes(listingId);

    if (isFavorite) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", userData.user.id)
        .eq("listing_id", listingId);

      if (error) {
        console.error("Kunne ikke fjerne favorit:", error);
        return;
      }

      await supabase.rpc("decrement_favorite_count", {
        listing_id_input: listingId,
      });

      setFavorites((previousFavorites) =>
        previousFavorites.filter((id) => id !== listingId)
      );

      return;
    }

    const { error } = await supabase
      .from("favorites")
      .insert({
        user_id: userData.user.id,
        listing_id: listingId,
      });

    if (error) {
      console.error("Kunne ikke tilføje favorit:", error);
      return;
    }

    await supabase.rpc("increment_favorite_count", {
      listing_id_input: listingId,
    });

    setFavorites((previousFavorites) => [
      ...previousFavorites,
      listingId,
    ]);
  }

  return (
    <main className="min-h-screen bg-[#f8f6f1]">
      <Header />

      <Hero />

      <ExploreCategories />

      <section className="mx-auto max-w-7xl pb-14 md:pb-20">
        <div className="space-y-12">
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
            href="/annoncer"
            listings={latestListings}
            favorites={favorites}
            toggleFavorite={toggleFavorite}
          />
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-8 pb-20 lg:grid-cols-3">
        <div className="rounded-3xl bg-[#0b3b2f] p-8 text-white">
          <p className="mb-4 text-sm uppercase tracking-[0.25em] text-[#d4af37]">
            Find annoncer
          </p>

          <h3 className="mb-6 font-serif text-3xl">
            Find præcis det, du leder efter
          </h3>

          <Link
            href="/annoncer"
            className="inline-block rounded-full bg-white px-6 py-3 text-sm font-medium text-black"
          >
            Se alle annoncer
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