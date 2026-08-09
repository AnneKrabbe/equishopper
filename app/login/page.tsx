"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import Header from "@/components/home/Header";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      setMessage("Udfyld både email og adgangskode.");
      return;
    }

    try {
      setIsLoading(true);
      setMessage("");

      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        const normalizedMessage = error.message.toLowerCase();

        if (
          normalizedMessage.includes("email not confirmed") ||
          normalizedMessage.includes("email_not_confirmed")
        ) {
          setMessage(
            "Din email er endnu ikke bekræftet. Åbn bekræftelsesmailen fra Equishopper, før du logger ind."
          );
          return;
        }

        if (normalizedMessage.includes("invalid login credentials")) {
          setMessage("Email eller adgangskode er forkert.");
          return;
        }

        throw error;
      }

      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error("Kunne ikke logge ind:", error);

      setMessage(
        error instanceof Error
          ? `Der skete en fejl: ${error.message}`
          : "Der skete en fejl under login."
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
              Velkommen tilbage
            </p>

            <h1 className="mt-5 max-w-3xl font-serif text-5xl leading-[1.05] text-white sm:text-6xl lg:text-7xl">
              Log ind
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/70 sm:text-xl">
              Log ind for at købe, sælge og skrive med andre brugere.
            </p>
          </div>
        </section>

        <section className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
          <div className="mx-auto w-full max-w-4xl">
            <div className="mx-auto w-full max-w-xl rounded-[30px] border border-[#e7e1d7] bg-white p-6 shadow-[0_18px_60px_rgba(35,45,40,0.07)] sm:p-8 lg:p-10">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d4af37]">
                  Din konto
                </p>

                <h2 className="mt-3 font-serif text-3xl font-bold text-[#063f32] sm:text-4xl">
                  Velkommen tilbage
                </h2>

                <p className="mt-3 text-sm leading-6 text-stone-600 sm:text-base">
                  Indtast dine oplysninger for at fortsætte til Equishopper.
                </p>
              </div>

              <form onSubmit={handleSignIn} className="mt-8 space-y-5">
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
                    }}
                    disabled={isLoading}
                    className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3.5 text-base text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-[#0b5a47] focus:ring-4 focus:ring-[#0b5a47]/10 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold text-stone-700"
                  >
                    Adgangskode
                  </label>

                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    minLength={6}
                    placeholder="Din adgangskode"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setMessage("");
                    }}
                    disabled={isLoading}
                    className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3.5 text-base text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-[#0b5a47] focus:ring-4 focus:ring-[#0b5a47]/10 disabled:opacity-60"
                  />
                </div>

                <div className="flex justify-end">
                  <Link
                    href="/forgot-password"
                    className="text-sm font-semibold text-[#063f32] underline decoration-[#d4af37] decoration-2 underline-offset-4 transition hover:text-[#0b5a47]"
                  >
                    Glemt adgangskode?
                  </Link>
                </div>

                {message && (
                  <div
                    role="alert"
                    className="rounded-2xl border border-[#eadfcb] bg-[#fbfaf7] p-4 text-sm leading-6 text-stone-700"
                  >
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex w-full items-center justify-center rounded-full bg-[#d4af37] px-5 py-3.5 font-semibold text-[#063f32] shadow-lg shadow-[#063f32]/10 transition hover:bg-[#e1c05a] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? "Logger ind..." : "Log ind"}
                </button>
              </form>

              <div className="mt-8 border-t border-[#eadfcb] pt-7 text-center">
                <p className="text-sm text-stone-600">
                  Har du endnu ikke en bruger?
                </p>

                <Link
                  href="/register"
                  className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-[#063f32] px-5 py-3.5 font-semibold text-[#063f32] transition hover:bg-[#063f32] hover:text-white"
                >
                  Opret bruger
                </Link>

<p className="mt-6 text-center text-sm leading-6 text-stone-500">
  Ved oprettelse af en konto accepterer du Equishoppers{" "}
  <Link
    href="/handelsbetingelser"
    className="font-semibold text-[#063f32] underline decoration-[#d4af37] underline-offset-4 hover:text-[#0b5a47]"
  >
    handelsbetingelser
  </Link>{" "}
  og{" "}
  <Link
    href="/privatlivspolitik"
    className="font-semibold text-[#063f32] underline decoration-[#d4af37] underline-offset-4 hover:text-[#0b5a47]"
  >
    privatlivspolitik
  </Link>.
</p>

              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}