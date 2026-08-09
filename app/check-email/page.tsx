"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import Header from "@/components/home/Header";

export default function CheckEmailPage() {
  return (
    <Suspense fallback={<CheckEmailLoading />}>
      <CheckEmailContent />
    </Suspense>
  );
}

function CheckEmailContent() {
  const searchParams = useSearchParams();

  const email = searchParams.get("email")?.trim() || "";
  const avatarPending = searchParams.get("avatar") === "pending";

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#f8f5ee]">
        <section className="bg-[#063f32] px-4 pb-20 pt-36 sm:px-6 sm:pb-24 sm:pt-40 lg:px-8">
          <div className="mx-auto w-full max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#d4af37]">
              Næsten færdig
            </p>

            <h1 className="mt-5 max-w-3xl font-serif text-5xl leading-[1.05] text-white sm:text-6xl lg:text-7xl">
              Tjek din email
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/70 sm:text-xl">
              Vi har sendt dig et link, som du skal bruge til at bekræfte din
              Equishopper-konto.
            </p>
          </div>
        </section>

        <section className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
          <div className="mx-auto w-full max-w-4xl">
            <div className="mx-auto w-full max-w-xl rounded-[30px] border border-[#e7e1d7] bg-white p-6 shadow-[0_18px_60px_rgba(35,45,40,0.07)] sm:p-8 lg:p-10">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#edf5f0] text-[#063f32]">
                <MailIcon />
              </div>

              <p className="mt-7 text-xs font-semibold uppercase tracking-[0.24em] text-[#d4af37]">
                Bekræft din konto
              </p>

              <h2 className="mt-3 font-serif text-3xl font-bold text-[#063f32] sm:text-4xl">
                Åbn bekræftelsesmailen
              </h2>

              <p className="mt-4 text-base leading-7 text-stone-600">
                {email ? (
                  <>
                    Vi har sendt en bekræftelsesmail til{" "}
                    <span className="font-semibold text-[#063f32]">
                      {email}
                    </span>
                    .
                  </>
                ) : (
                  <>
                    Vi har sendt en bekræftelsesmail til den emailadresse, du
                    brugte ved oprettelsen.
                  </>
                )}
              </p>

              <p className="mt-4 text-sm leading-6 text-stone-500">
                Klik på linket i mailen. Når din email er bekræftet, bliver du
                sendt videre til login, hvor du kan logge ind på din nye konto.
              </p>

              {avatarPending && (
                <div className="mt-6 rounded-2xl border border-[#eadfcb] bg-[#fbfaf7] p-4 text-sm leading-6 text-stone-600">
                  Dit valgte profilbillede bliver ikke uploadet, før din konto er
                  bekræftet. Du kan tilføje eller ændre profilbilledet på din
                  profil efter første login.
                </div>
              )}

              <div className="mt-8 rounded-2xl border border-[#eadfcb] bg-[#fbfaf7] p-5">
                <p className="font-semibold text-[#063f32]">
                  Kan du ikke finde mailen?
                </p>

                <p className="mt-2 text-sm leading-6 text-stone-600">
                  Tjek spam eller uønsket post, og kontrollér at emailadressen
                  ovenfor er korrekt.
                </p>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-full bg-[#d4af37] px-5 py-3.5 font-semibold text-[#063f32] transition hover:bg-[#e1c05a]"
                >
                  Gå til login
                </Link>

                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-full border border-[#063f32] px-5 py-3.5 font-semibold text-[#063f32] transition hover:bg-[#063f32] hover:text-white"
                >
                  Ret oplysninger
                </Link>
              </div>

              <p className="mt-7 text-center text-xs leading-5 text-stone-400">
                Du kan først logge ind, når din email er bekræftet.
              </p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function CheckEmailLoading() {
  return (
    <>
      <Header />

      <main className="flex min-h-screen items-center justify-center bg-[#f8f5ee]">
        <p className="text-[#063f32]">Indlæser...</p>
      </main>
    </>
  );
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-8 w-8"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}