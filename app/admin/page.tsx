"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  FilePlus2,
  Loader2,
  Megaphone,
  Scale,
  ShieldAlert,
} from "lucide-react";

import Header from "@/components/home/Header";
import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    void initialize();
  }, []);

  async function initialize() {
    try {
      setLoading(true);
      setErrorMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        router.replace("/login?redirect=/admin");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (profile?.role !== "admin") {
        setAuthorized(false);
        setErrorMessage("Du har ikke adgang til adminområdet.");
        return;
      }

      setAuthorized(true);
    } catch (error) {
      console.error("Adminområdet kunne ikke indlæses:", error);

      setAuthorized(false);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Adminområdet kunne ikke indlæses.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f8f5ee]">
        <Header />

        <div className="flex min-h-[70vh] items-center justify-center pt-24">
          <Loader2 className="h-9 w-9 animate-spin text-[#063f32]" />
        </div>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="min-h-screen bg-[#f8f5ee]">
        <Header />

        <section className="mx-auto max-w-2xl px-5 pb-20 pt-36">
          <div className="rounded-[30px] border border-red-200 bg-white p-8 text-center shadow-sm">
            <ShieldAlert className="mx-auto h-12 w-12 text-red-600" />

            <h1 className="mt-5 font-serif text-3xl font-bold text-[#063f32]">
              Ingen adgang
            </h1>

            <p className="mt-3 text-stone-600">
              {errorMessage || "Du har ikke adgang til adminområdet."}
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f5ee]">
      <Header />

      {/* HERO */}
      <section className="bg-[#063f32] px-4 pb-16 pt-32 sm:px-6 sm:pt-36 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#d4af37]">
            Equishopper
          </p>

          <h1 className="mt-3 font-serif text-4xl font-bold text-white sm:text-5xl">
            Administration
          </h1>

          <p className="mt-4 max-w-2xl leading-7 text-white/65">
            Administrer Equishopper, håndter tvister, kampagner og opret
            annoncer på vegne af brugere.
          </p>
        </div>
      </section>

      {/* ADMIN BOARDS */}
      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {/* TVISTER */}
            <AdminCard
              href="/admin/tvister"
              icon={<Scale className="h-6 w-6" />}
              title="Tvister"
              description="Se og håndter aktive tvister mellem købere og sælgere."
              action="Åbn tvister"
            />

            {/* KAMPAGNER */}
            <AdminCard
              href="/admin/kampagner"
              icon={<Megaphone className="h-6 w-6" />}
              title="Kampagner"
              description="Administrer kampagner og individuelle sælgergebyrer."
              action="Åbn kampagner"
            />

            {/* OPRET ANNONCE */}
            <AdminCard
              href="/admin/create-listing"
              icon={<FilePlus2 className="h-6 w-6" />}
              title="Opret annonce"
              description="Opret en annonce på vegne af en eksisterende bruger."
              action="Opret annonce"
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function AdminCard({
  href,
  icon,
  title,
  description,
  action,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  action: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-[240px] flex-col rounded-[28px] border border-[#e7e1d7] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#edf5f0] text-[#0b5a47]">
        {icon}
      </div>

      <h2 className="mt-6 font-serif text-2xl font-bold text-[#063f32]">
        {title}
      </h2>

      <p className="mt-3 flex-1 text-sm leading-6 text-stone-600">
        {description}
      </p>

      <div className="mt-6 flex items-center justify-between border-t border-stone-100 pt-5">
        <span className="text-sm font-semibold text-[#8a6c13]">
          {action}
        </span>

        <ChevronRight className="h-5 w-5 text-[#8a6c13] transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}