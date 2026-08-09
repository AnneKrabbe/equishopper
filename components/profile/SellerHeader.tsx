"use client";

import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  MapPin,
  Phone,
  ShieldCheck,
  Star,
} from "lucide-react";

type SellerHeaderProps = {
  profile: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    city: string | null;
    average_rating: number | null;
    review_count: number | null;
    created_at: string | null;
    identity_verified: boolean;
    phone_verified: boolean;
    completed_sales?: number;
  };
};

function getInitials(name?: string | null) {
  if (!name) return "?";

  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function memberSince(date?: string | null) {
  if (!date) return "";

  return new Intl.DateTimeFormat("da-DK", {
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export default function SellerHeader({
  profile,
}: SellerHeaderProps) {
  return (
    <section className="relative w-full">
      <div className="relative left-1/2 w-screen -translate-x-1/2">
        <div className="relative h-[440px] overflow-hidden md:h-[560px]">
          <img
            src="/images/profile-banner.png"
            alt="Hest på en smuk eng"
            className="absolute inset-0 h-full w-full object-cover object-[center_42%]"
          />

          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/5 to-black/40" />
        </div>
      </div>

      {/* Profilkort oven på heroen */}
      <div className="relative z-10 mx-auto -mt-28 w-full max-w-[1800px] px-6 md:px-16">
        <div className="grid gap-8 rounded-[32px] border border-stone-200 bg-white p-6 shadow-2xl md:grid-cols-[minmax(0,1fr)_300px] md:items-center lg:p-8">
          {/* Profilinformation */}
          <div className="flex min-w-0 flex-col gap-6 sm:flex-row sm:items-center">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name ?? "Profilbillede"}
                className="h-32 w-32 shrink-0 rounded-full border-4 border-white object-cover shadow-lg"
              />
            ) : (
              <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-full border-4 border-white bg-[#063f32] text-4xl font-bold text-white shadow-lg">
                {getInitials(profile.full_name)}
              </div>
            )}

            <div className="min-w-0">
              <h1 className="break-words text-3xl font-bold leading-tight text-[#063f32] lg:text-4xl">
                {profile.full_name || "Bruger"}
              </h1>

              {profile.username && (
                <p className="mt-1 text-lg text-stone-500">
                  @{profile.username}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-stone-600">
                {profile.city && (
                  <span className="flex items-center gap-2">
                    <MapPin size={16} />
                    {profile.city}
                  </span>
                )}

                <span className="flex items-center gap-2">
                  <Calendar size={16} />
                  Medlem siden {memberSince(profile.created_at)}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <Star
                  size={18}
                  className="fill-yellow-400 text-yellow-400"
                />

                <span className="font-semibold text-stone-900">
                  {profile.review_count
                    ? (profile.average_rating ?? 0).toFixed(1)
                    : "Ingen anmeldelser"}
                </span>

                {!!profile.review_count && (
                  <span className="text-stone-500">
                    ({profile.review_count})
                  </span>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                {profile.identity_verified && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-700">
                    <ShieldCheck size={16} />
                    Verificeret sælger
                  </span>
                )}

                {profile.phone_verified && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700">
                    <Phone size={16} />
                    Telefon bekræftet
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Statistikboks */}
          <div className="w-full rounded-3xl bg-[#f8f6f1] p-6">
            <div className="grid grid-cols-2 gap-5 text-center">
              <div>
                <p className="text-3xl font-bold text-[#063f32]">
                  {profile.completed_sales ?? 0}
                </p>

                <p className="mt-1 text-xs uppercase tracking-wider text-stone-500">
                  Salg
                </p>
              </div>

              <div>
                <p className="text-3xl font-bold text-[#063f32]">
                  {profile.review_count ?? 0}
                </p>

                <p className="mt-1 text-xs uppercase tracking-wider text-stone-500">
                  Anmeldelser
                </p>
              </div>

              <div>
                <p className="text-3xl font-bold text-[#063f32]">--</p>

                <p className="mt-1 text-xs uppercase tracking-wider text-stone-500">
                  Afstand
                </p>
              </div>

              <div>
                <p className="text-3xl font-bold text-[#063f32]">--</p>

                <p className="mt-1 text-xs uppercase tracking-wider text-stone-500">
                  Svartid
                </p>
              </div>
            </div>

            <Link
              href="/messages"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#063f32] px-6 py-4 font-semibold text-white transition hover:bg-[#0b5a47]"
            >
              Kontakt sælger
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}