"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { CheckCircle2, Loader2, Mail } from "lucide-react";

import Header from "@/components/home/Header";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setErrorMessage("Indtast din emailadresse.");
      return;
    }

    try {
      setIsLoading(true);
      setMessage("");
      setErrorMessage("");
      setSent(false);

      const redirectTo = `${window.location.origin}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(
        trimmedEmail,
        {
          redirectTo,
        },
      );

      if (error) {
        console.error("Password reset fejl:", error);
        throw error;
      }

      setSent(true);
      setMessage(
        "Hvis emailadressen er tilknyttet en Equishopper-konto, har vi sendt et link til nulstilling af din adgangskode.",
      );
    } catch (error) {
      console.error("Kunne ikke sende password reset:", error);

      setErrorMessage(
        error instanceof Error
          ? `Linket kunne ikke sendes: ${error.message}`
          : "Linket kunne ikke sendes. Prøv igen om lidt.",
      );
    } finally {
      setIsLoading(false);
    }
  }

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
              Glemt adgangskode?
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/70 sm:text-xl">
              Vi sender dig et sikkert link, så du kan vælge en ny
              adgangskode.
            </p>
          </div>
        </section>

        <section className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
          <div className="mx-auto w-full max-w-4xl">
            <div className="mx-auto w-full max-w-xl rounded-[30px] border border-[#e7e1d7] bg-white p-6 shadow-[0_18px_60px_rgba(35,45,40,0.07)] sm:p-8 lg:p-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#edf4ef] text-[#063f32]">
                <Mail className="h-6 w-6" />
              </div>

              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-[#d4af37]">
                Nulstil adgangskode
              </p>

              <h2 className="mt-3 font-serif text-3xl font-bold text-[#063f32] sm:text-4xl">
                Få tilsendt et nyt link
              </h2>

              <p className="mt-3 text-sm leading-6 text-stone-600 sm:text-base">
                Indtast den emailadresse, du bruger på Equishopper.
                Vi sender et link, hvor du kan vælge en ny adgangskode.
              </p>

              <form
                onSubmit={handleSubmit}
                className="mt-8 space-y-5"
              >
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-stone-700"
                  >
                    Email
                  </label>

                  <input
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                    placeholder="navn@email.dk"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setMessage("");
                      setErrorMessage("");
                      setSent(false);
                    }}
                    disabled={isLoading}
                    className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3.5 text-base text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-[#0b5a47] focus:ring-4 focus:ring-[#0b5a47]/10 disabled:opacity-60"
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

                {sent && message && (
                  <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />

                    <p className="text-sm leading-6 text-emerald-800">
                      {message}
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#d4af37] px-5 py-3.5 font-semibold text-[#063f32] shadow-lg shadow-[#063f32]/10 transition hover:bg-[#e1c05a] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading && (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  )}

                  {isLoading
                    ? "Sender link..."
                    : sent
                      ? "Send link igen"
                      : "Send link"}
                </button>
              </form>

              <div className="mt-8 border-t border-[#eadfcb] pt-7 text-center">
                <p className="text-sm text-stone-600">
                  Kan du huske din adgangskode?
                </p>

                <Link
                  href="/login"
                  className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-[#063f32] px-5 py-3.5 font-semibold text-[#063f32] transition hover:bg-[#063f32] hover:text-white"
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