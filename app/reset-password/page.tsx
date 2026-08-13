"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  LockKeyhole,
} from "lucide-react";
import { useRouter } from "next/navigation";

import Header from "@/components/home/Header";
import { supabase } from "@/lib/supabase";

type RecoveryState =
  | "loading"
  | "ready"
  | "invalid"
  | "success";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [recoveryState, setRecoveryState] =
    useState<RecoveryState>("loading");

  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function initializeRecovery() {
      try {
        /*
         * Supabase-klienten forsøger selv at læse recovery-data
         * fra URL'en, når klienten initialiseres.
         *
         * Vi tjekker både URL-fejl og en eventuel eksisterende session.
         */

        const hashParams = new URLSearchParams(
          window.location.hash.replace(/^#/, ""),
        );

        const queryParams = new URLSearchParams(
          window.location.search,
        );

        const authError =
          hashParams.get("error") ||
          queryParams.get("error");

        const authErrorCode =
          hashParams.get("error_code") ||
          queryParams.get("error_code");

        const authErrorDescription =
          hashParams.get("error_description") ||
          queryParams.get("error_description");

        if (authError) {
          if (!mounted) return;

          setRecoveryState("invalid");

          if (authErrorCode === "otp_expired") {
            setErrorMessage(
              "Linket til nulstilling af adgangskoden er udløbet eller er allerede blevet brugt. Bed om et nyt link.",
            );
          } else {
            setErrorMessage(
              authErrorDescription
                ? decodeURIComponent(
                    authErrorDescription.replace(/\+/g, " "),
                  )
                : "Linket til nulstilling af adgangskoden er ikke længere gyldigt.",
            );
          }

          return;
        }

        /*
         * Hvis Supabase allerede har oprettet recovery-sessionen,
         * kan brugeren gå direkte videre.
         */
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (!mounted) return;

        if (session) {
          setRecoveryState("ready");
        }
      } catch (error) {
        console.error(
          "Kunne ikke initialisere password recovery:",
          error,
        );

        if (!mounted) return;

        setRecoveryState("invalid");
        setErrorMessage(
          "Nulstillingslinket kunne ikke valideres. Bed om et nyt link.",
        );
      }
    }

    /*
     * PASSWORD_RECOVERY er Supabases signal om,
     * at recovery-linket er accepteret, og sessionen er klar.
     */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        if (event === "PASSWORD_RECOVERY" && session) {
          setRecoveryState("ready");
          setErrorMessage("");
        }
      },
    );

    void initializeRecovery();

    /*
     * Hvis URL-parseren/sessionen ikke er færdig med det samme,
     * giver vi Supabase et kort øjeblik til at behandle redirectet.
     */
    const timeout = window.setTimeout(async () => {
      if (!mounted) return;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (session) {
        setRecoveryState("ready");
        return;
      }

      setRecoveryState((current) =>
        current === "loading" ? "invalid" : current,
      );

      setErrorMessage((current) =>
        current ||
        "Nulstillingslinket er udløbet eller kunne ikke valideres. Bed om et nyt link.",
      );
    }, 1500);

    return () => {
      mounted = false;
      window.clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (recoveryState !== "ready") {
      return;
    }

    if (password.length < 8) {
      setErrorMessage(
        "Adgangskoden skal være på mindst 8 tegn.",
      );
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Adgangskoderne er ikke ens.");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage("");

      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        throw error;
      }

      setRecoveryState("success");

      /*
       * Vi logger recovery-sessionen ud bagefter,
       * så brugeren logger ind igen med den nye kode.
       */
      await supabase.auth.signOut();

      window.setTimeout(() => {
        router.replace("/login");
        router.refresh();
      }, 1800);
    } catch (error) {
      console.error(
        "Kunne ikke opdatere adgangskode:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Adgangskoden kunne ikke opdateres.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const formDisabled =
    recoveryState !== "ready" || isSaving;

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#f8f5ee]">
        <section className="bg-[#063f32] px-4 pb-20 pt-36 sm:px-6 sm:pb-24 sm:pt-40 lg:px-8">
          <div className="mx-auto w-full max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#d4af37]">
              Din konto
            </p>

            <h1 className="mt-5 max-w-3xl font-serif text-5xl leading-[1.05] text-white sm:text-6xl lg:text-7xl">
              Ny adgangskode
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/70 sm:text-xl">
              Vælg en ny adgangskode til din Equishopper-konto.
            </p>
          </div>
        </section>

        <section className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
          <div className="mx-auto w-full max-w-4xl">
            <div className="mx-auto w-full max-w-xl rounded-[30px] border border-[#e7e1d7] bg-white p-6 shadow-[0_18px_60px_rgba(35,45,40,0.07)] sm:p-8 lg:p-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#edf4ef] text-[#063f32]">
                <LockKeyhole className="h-6 w-6" />
              </div>

              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-[#d4af37]">
                Sikkerhed
              </p>

              <h2 className="mt-3 font-serif text-3xl font-bold text-[#063f32] sm:text-4xl">
                Vælg din nye adgangskode
              </h2>

              {recoveryState === "loading" && (
                <div className="mt-7 flex items-center gap-3 rounded-2xl border border-[#eadfcb] bg-[#fbfaf7] p-4 text-sm text-stone-600">
                  <Loader2 className="h-5 w-5 animate-spin text-[#063f32]" />
                  Kontrollerer dit nulstillingslink...
                </div>
              )}

              {recoveryState === "invalid" && (
                <div className="mt-7">
                  <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

                    <div>
                      <p className="font-semibold text-amber-900">
                        Linket kan ikke bruges
                      </p>

                      <p className="mt-1 text-sm leading-6 text-amber-800">
                        {errorMessage}
                      </p>
                    </div>
                  </div>

                  <Link
                    href="/forgot-password"
                    className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-[#d4af37] px-5 py-3.5 font-semibold text-[#063f32] transition hover:bg-[#e1c05a]"
                  >
                    Send et nyt nulstillingslink
                  </Link>
                </div>
              )}

              {recoveryState === "success" && (
                <div className="mt-7 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />

                  <div>
                    <p className="font-semibold text-emerald-900">
                      Adgangskoden er ændret
                    </p>

                    <p className="mt-1 text-sm leading-6 text-emerald-800">
                      Du bliver sendt videre til login.
                    </p>
                  </div>
                </div>
              )}

              {recoveryState === "ready" && (
                <>
                  <p className="mt-3 text-sm leading-6 text-stone-600 sm:text-base">
                    Adgangskoden skal være på mindst 8 tegn.
                  </p>

                  <form
                    onSubmit={handleSubmit}
                    className="mt-8 space-y-5"
                  >
                    <div>
                      <label
                        htmlFor="password"
                        className="mb-2 block text-sm font-semibold text-stone-700"
                      >
                        Ny adgangskode
                      </label>

                      <input
                        id="password"
                        type="password"
                        autoComplete="new-password"
                        required
                        minLength={8}
                        value={password}
                        onChange={(event) => {
                          setPassword(event.target.value);
                          setErrorMessage("");
                        }}
                        disabled={formDisabled}
                        className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3.5 text-base text-stone-800 outline-none transition focus:border-[#0b5a47] focus:ring-4 focus:ring-[#0b5a47]/10 disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="confirmPassword"
                        className="mb-2 block text-sm font-semibold text-stone-700"
                      >
                        Gentag adgangskode
                      </label>

                      <input
                        id="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        required
                        minLength={8}
                        value={confirmPassword}
                        onChange={(event) => {
                          setConfirmPassword(
                            event.target.value,
                          );
                          setErrorMessage("");
                        }}
                        disabled={formDisabled}
                        className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3.5 text-base text-stone-800 outline-none transition focus:border-[#0b5a47] focus:ring-4 focus:ring-[#0b5a47]/10 disabled:opacity-60"
                      />
                    </div>

                    {errorMessage && (
                      <div
                        role="alert"
                        className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
                      >
                        {errorMessage}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={formDisabled}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#d4af37] px-5 py-3.5 font-semibold text-[#063f32] shadow-lg shadow-[#063f32]/10 transition hover:bg-[#e1c05a] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSaving && (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      )}

                      {isSaving
                        ? "Gemmer..."
                        : "Gem ny adgangskode"}
                    </button>
                  </form>
                </>
              )}

              <div className="mt-8 border-t border-[#eadfcb] pt-7 text-center">
                <Link
                  href="/login"
                  className="text-sm font-semibold text-[#063f32] underline decoration-[#d4af37] decoration-2 underline-offset-4 transition hover:text-[#0b5a47]"
                >
                  Tilbage til login
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}