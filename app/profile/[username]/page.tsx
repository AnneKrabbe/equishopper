"use client";

import { useEffect, useState } from "react";
import { notFound, useParams } from "next/navigation";

import { supabase } from "@/lib/supabase";

import Header from "@/components/home/Header";
import SellerHeader from "@/components/profile/SellerHeader";
import SellerAbout from "@/components/profile/SellerAbout";
import SellerListings from "@/components/profile/SellerListings";
import SellerReviews from "@/components/profile/SellerReviews";

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  city: string | null;
  postal_code: string | null;
  bio: string | null;
  created_at: string | null;

  average_rating: number | null;
  review_count: number | null;

  phone_verified: boolean;
  identity_verified: boolean;

  completed_sales: number;
  completed_purchases: number;
};

export default function SellerProfilePage() {
  const params = useParams();

  const username =
    typeof params.username === "string"
      ? decodeURIComponent(params.username)
      : "";

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      if (!username) {
        return;
      }

      setLoading(true);
      setLoadError(null);

      try {
        const {
          data: profileData,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select("*")
          .eq("username", username)
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        if (!profileData) {
          notFound();
          return;
        }

        const [
          { data: listingData, error: listingError },
          { data: reviewData, error: reviewError },
        ] = await Promise.all([
          supabase
            .from("listings")
            .select(`
              *,
              listing_images (
                image_url,
                sort_order
              )
            `)
            .eq("seller_id", profileData.id)
            .eq("status", "active")
            .order("created_at", { ascending: false }),

          supabase
            .from("reviews")
            .select(`
              *,
              reviewer:profiles!reviews_reviewer_id_fkey (
                full_name,
                avatar_url
              )
            `)
            .eq("reviewed_user_id", profileData.id)
            .order("created_at", { ascending: false }),
        ]);

        if (listingError) {
          throw listingError;
        }

        if (reviewError) {
          throw reviewError;
        }

        if (!isMounted) {
          return;
        }

        setProfile(profileData as Profile);
        setListings(listingData ?? []);
        setReviews(reviewData ?? []);
      } catch (error) {
        console.error("Kunne ikke indlæse sælgerprofil:", error);

        if (isMounted) {
          setLoadError(
            "Profilen kunne ikke indlæses. Prøv at genindlæse siden."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [username]);

  if (loading) {
    return (
      <>
        <Header />

        <main className="min-h-screen overflow-x-clip bg-stone-50">
          {/* Loading-hero helt op til topbaren */}
          <section className="relative w-full">
            <div className="relative h-[440px] w-full overflow-hidden bg-stone-300 md:h-[560px]">
              <img
                src="/images/profile-banner.png"
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover object-[center_42%]"
              />

              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/5 to-black/45" />
            </div>

            {/* Loading-kort, der overlapper heroen */}
            <div className="relative z-10 mx-auto -mt-28 w-full max-w-[1800px] px-4 sm:px-6 md:px-8">
              <div className="rounded-[32px] border border-stone-200 bg-white p-6 shadow-2xl sm:p-8">
                <div className="animate-pulse">
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                    <div className="h-32 w-32 shrink-0 rounded-full bg-stone-200" />

                    <div className="flex-1 space-y-4">
                      <div className="h-8 w-56 rounded-full bg-stone-200" />
                      <div className="h-5 w-36 rounded-full bg-stone-200" />

                      <div className="flex flex-wrap gap-3">
                        <div className="h-5 w-32 rounded-full bg-stone-200" />
                        <div className="h-5 w-44 rounded-full bg-stone-200" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
            <div className="flex min-h-56 items-center justify-center">
              <p className="text-lg text-stone-500">
                Indlæser profil...
              </p>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (loadError) {
    return (
      <>
        <Header />

        <main className="min-h-screen overflow-x-clip bg-stone-50">
          <section className="relative h-[360px] w-full overflow-hidden md:h-[440px]">
            <img
              src="/images/profile-banner.png"
              alt="Hest på en eng"
              className="absolute inset-0 h-full w-full object-cover object-[center_42%]"
            />

            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/50" />
          </section>

          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
            <div className="rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
              <h1 className="text-2xl font-bold text-[#063f32]">
                Profilen kunne ikke indlæses
              </h1>

              <p className="mt-3 text-stone-600">
                {loadError}
              </p>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-6 rounded-full bg-[#063f32] px-6 py-3 font-medium text-white transition hover:bg-[#0b5a47]"
              >
                Prøv igen
              </button>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <>
      <Header />

      <main className="min-h-screen overflow-x-clip bg-stone-50">
        {/*
          SellerHeader ligger uden for max-width-wrapperen.
          Derfor kan hero-billedet fylde hele browserbredden.
        */}
        <SellerHeader profile={profile} />

        {/*
          Kun indholdet under heroen bliver centreret og begrænset
          til max-w-7xl.
        */}
        <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
            <div className="min-w-0 space-y-8">
              {/* Aktive annoncer */}
              <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                  <h2 className="text-2xl font-bold text-[#063f32]">
                    Aktive annoncer
                  </h2>

                  <span className="rounded-full bg-[#f4f1e8] px-4 py-2 text-sm font-medium text-[#063f32]">
                    {listings.length}{" "}
                    {listings.length === 1 ? "annonce" : "annoncer"}
                  </span>
                </div>

                <SellerListings listings={listings} />
              </section>

              {/* Anmeldelser */}
              <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                  <h2 className="text-2xl font-bold text-[#063f32]">
                    Anmeldelser
                  </h2>

                  <span className="text-sm text-stone-500">
                    {reviews.length}{" "}
                    {reviews.length === 1
                      ? "anmeldelse"
                      : "anmeldelser"}
                  </span>
                </div>

                <SellerReviews reviews={reviews} />
              </section>
            </div>

            {/* Om sælgeren */}
            <aside className="lg:sticky lg:top-32">
              <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
                <SellerAbout bio={profile.bio} />
              </section>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}