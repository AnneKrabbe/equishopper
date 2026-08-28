"use client";

import { useState } from "react";

import { supabase } from "@/lib/supabase";

type StripeConnectCardProps = {
  connected: boolean;
  detailsSubmitted: boolean;
  payoutsEnabled: boolean;
};

type StripeResponse = {
  url?: string;
  error?: string;
  needsOnboarding?: boolean;
};

export default function StripeConnectCard({
  connected,
  detailsSubmitted,
  payoutsEnabled,
}: StripeConnectCardProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [needsReconnect, setNeedsReconnect] = useState(false);

  const ready =
    connected &&
    detailsSubmitted &&
    payoutsEnabled &&
    !needsReconnect;

  async function getAccessToken() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session) {
      window.location.href = "/login?redirect=/profil";
      return null;
    }

    return session.access_token;
  }

  async function startOnboarding() {
    if (loading) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        return;
      }

      const response = await fetch("/api/stripe/connect/onboard", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const result = (await response.json()) as StripeResponse;

      if (!response.ok || !result.url) {
        throw new Error(
          result.error ?? "Stripe-onboarding kunne ikke startes.",
        );
      }

      window.location.href = result.url;
    } catch (error) {
      console.error("Stripe-onboarding kunne ikke startes:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Stripe-onboarding kunne ikke startes.",
      );
      setLoading(false);
    }
  }

  async function openStripeDashboard() {
    if (loading) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        return;
      }

      const response = await fetch("/api/stripe/connect/dashboard", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const result = (await response.json()) as StripeResponse;

      if (response.status === 409 && result.needsOnboarding) {
        setNeedsReconnect(true);
        setMessage(
          "Din tidligere Stripe-forbindelse tilhører ikke det aktive live-miljø. Forbind Stripe igen for at modtage udbetalinger.",
        );
        setLoading(false);
        return;
      }

      if (!response.ok || !result.url) {
        throw new Error(
          result.error ?? "Stripe-kontoen kunne ikke åbnes.",
        );
      }

      window.location.href = result.url;
    } catch (error) {
      console.error("Stripe-kontoen kunne ikke åbnes:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Stripe-kontoen kunne ikke åbnes.",
      );
      setLoading(false);
    }
  }

  return (
    <section className="rounded-[30px] border border-[#e7e1d7] bg-white p-6 shadow-[0_18px_60px_rgba(35,45,40,0.06)] sm:p-8">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#e7efe8] text-[#063f32]">
          <CardIcon />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0b5a47]">
            Udbetalinger
          </p>

          <h2 className="mt-2 font-serif text-3xl font-bold text-[#063f32]">
            Stripe-konto
          </h2>

          {ready ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-emerald-700">
                  <CheckIcon />
                </span>

                <div>
                  <p className="font-semibold text-emerald-900">
                    Klar til udbetaling
                  </p>
                  <p className="mt-1 text-sm leading-6 text-emerald-800">
                    Din Stripe-konto er forbundet og godkendt til at modtage udbetalinger.
                  </p>
                </div>
              </div>
            </div>
          ) : connected && !needsReconnect ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="font-semibold text-amber-900">
                Stripe-onboarding mangler at blive færdiggjort
              </p>
              <p className="mt-1 text-sm leading-6 text-amber-800">
                Færdiggør oplysningerne hos Stripe, før du kan modtage udbetalinger.
              </p>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="font-semibold text-amber-900">
                {needsReconnect
                  ? "Stripe skal forbindes igen"
                  : "Forbind din Stripe-konto"}
              </p>
              <p className="mt-1 text-sm leading-6 text-amber-800">
                {needsReconnect
                  ? "Din tidligere forbindelse kan ikke bruges i det aktive Stripe live-miljø."
                  : "Stripe bruges til sikker udbetaling, når du sælger en vare."}
              </p>
            </div>
          )}

          {message && (
            <div
              role="alert"
              className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
            >
              {message}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            {ready ? (
              <button
                type="button"
                onClick={() => void openStripeDashboard()}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-full bg-[#063f32] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0b5a47] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Åbner Stripe..." : "Administrer Stripe-konto"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void startOnboarding()}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-full bg-[#d4af37] px-5 py-3 text-sm font-semibold text-[#063f32] transition hover:bg-[#e1c05a] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Åbner Stripe..."
                  : needsReconnect
                    ? "Forbind Stripe igen"
                    : connected
                      ? "Fortsæt Stripe-onboarding"
                      : "Forbind Stripe"}
              </button>
            )}
          </div>

          {ready && (
            <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-500">
              Bankkonto og udbetalingsoplysninger ændres direkte hos Stripe. Equishopper gemmer ikke dine bankoplysninger.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function CardIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 9h18" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.5 2.5L16.5 8.5" />
    </svg>
  );
}
