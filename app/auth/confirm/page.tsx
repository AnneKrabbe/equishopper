"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import Header from "@/components/home/Header";
import { supabase } from "@/lib/supabase";

export default function ConfirmPage() {
  return (
    <Suspense fallback={<ConfirmLoading />}>
      <ConfirmContent />
    </Suspense>
  );
}

function ConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [message, setMessage] = useState("Bekræfter din email...");
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    async function handleConfirmation() {
      try {
        setHasError(false);

        // Supabase kan returnere en PKCE-code i query-stringen.
        const code = searchParams.get("code");

        if (code) {
          const { error } =
            await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            throw error;
          }

          setMessage("Din email er bekræftet. Du bliver logget ind...");

          router.replace("/");
          router.refresh();
          return;
        }

        // Supabase kan også returnere tokens i URL-fragmentet.
        // Browser-klienten forsøger normalt selv at læse disse.
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          setMessage("Din email er bekræftet. Du bliver logget ind...");

          router.replace("/");
          router.refresh();
          return;
        }

        // Giv Supabase et kort øjeblik til at behandle URL'en.
        await new Promise((resolve) => setTimeout(resolve, 800));

        const {
          data: { session: delayedSession },
        } = await supabase.auth.getSession();

        if (delayedSession) {
          setMessage("Din email er bekræftet. Du bliver logget ind...");

          router.replace("/");
          router.refresh();
          return;
        }

        throw new Error(
          "Bekræftelseslinket kunne ikke oprette en session."
        );
      } catch (error) {
        console.error("Kunne ikke bekræfte email:", error);

        setHasError(true);
        setMessage(
          "Vi kunne ikke logge dig ind automatisk. Linket kan være udløbet eller allerede brugt."
        );
      }
    }

    void handleConfirmation();
  }, [router, searchParams]);

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#f8f5ee]">
        <section className="bg-[#063f32] px-4 pb-20 pt-36 sm:px-6 sm:pb-24 sm:pt-40 lg:px-8">
          <div className="mx-auto w-full max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#d4af37]">
              Equishopper
            </p>

            <h1 className="mt-5 max-w-3xl font-serif text-5xl leading-[1.05] text-white sm:text-6xl lg:text-7xl">
              Bekræfter din konto
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/70 sm:text-xl">
              Et øjeblik – vi gør din konto klar.
            </p>
          </div>
        </section>

        <section className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
          <div className="mx-auto w-full max-w-4xl">
            <div className="mx-auto w-full max-w-xl rounded-[30px] border border-[#e7e1d7] bg-white p-6 text-center shadow-[0_18px_60px_rgba(35,45,40,0.07)] sm:p-8 lg:p-10">
              {!hasError ? (
                <>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#edf5f0] text-[#063f32]">
                    <LoadingIcon />
                  </div>

                  <h2 className="mt-6 font-serif text-3xl font-bold text-[#063f32]">
                    Velkommen til Equishopper
                  </h2>

                  <p className="mt-4 text-base leading-7 text-stone-600">
                    {message}
                  </p>
                </>
              ) : (
                <>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#fbfaf7] text-[#063f32]">
                    <MailIcon />
                  </div>

                  <h2 className="mt-6 font-serif text-3xl font-bold text-[#063f32]">
                    Bekræftelsen kunne ikke gennemføres
                  </h2>

                  <p className="mt-4 text-base leading-7 text-stone-600">
                    {message}
                  </p>

                  <button
                    type="button"
                    onClick={() => router.replace("/login")}
                    className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-[#d4af37] px-5 py-3.5 font-semibold text-[#063f32] transition hover:bg-[#e1c05a]"
                  >
                    Gå til login
                  </button>
                </>
              )}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function ConfirmLoading() {
  return (
    <>
      <Header />

      <main className="flex min-h-screen items-center justify-center bg-[#f8f5ee]">
        <p className="text-[#063f32]">Bekræfter din email...</p>
      </main>
    </>
  );
}

function LoadingIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-8 w-8 animate-spin"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" />
    </svg>
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