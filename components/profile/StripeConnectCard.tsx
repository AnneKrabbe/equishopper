"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Loader2,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type StripeConnectCardProps = {
  connected: boolean;
  detailsSubmitted: boolean;
  payoutsEnabled: boolean;
};

export default function StripeConnectCard({
  connected,
  detailsSubmitted,
  payoutsEnabled,
}: StripeConnectCardProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const ready =
    connected &&
    detailsSubmitted &&
    payoutsEnabled;

  async function startOnboarding() {
    try {
      setLoading(true);
      setErrorMessage("");

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session) {
        window.location.href =
          "/login?redirect=/profil";
        return;
      }

      const response = await fetch(
        "/api/stripe/connect/onboard",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const result = (await response.json()) as {
        url?: string;
        error?: string;
      };

      if (!response.ok || !result.url) {
        throw new Error(
          result.error ??
            "Stripe-onboarding kunne ikke startes."
        );
      }

      window.location.href = result.url;
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Stripe-onboarding kunne ikke startes."
      );

      setLoading(false);
    }
  }

  return (
    <section className="rounded-[30px] border border-[#e7e1d7] bg-white p-6 shadow-[0_18px_60px_rgba(35,45,40,0.06)] sm:p-8">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#edf4ef] text-[#063f32]">
          <CreditCard className="h-6 w-6" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0b5a47]">
            Udbetalinger
          </p>

          <h2 className="mt-2 font-serif text-2xl font-bold text-[#063f32]">
            Stripe-konto
          </h2>

          {ready ? (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />

              <div>
                <p className="font-semibold text-emerald-900">
                  Klar til udbetaling
                </p>

                <p className="mt-1 text-sm leading-6 text-emerald-800">
                  Din Stripe-konto er forbundet og godkendt
                  til at modtage udbetalinger.
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

              <div>
                <p className="font-semibold text-amber-900">
                  {connected
                    ? "Onboarding mangler"
                    : "Stripe er ikke forbundet"}
                </p>

                <p className="mt-1 text-sm leading-6 text-amber-800">
                  Forbind Stripe for at kunne modtage
                  udbetalinger fra dine salg.
                </p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div
              role="alert"
              className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {errorMessage}
            </div>
          )}

          {!ready && (
            <button
              type="button"
              onClick={startOnboarding}
              disabled={loading}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-[#d4af37] px-6 py-3 font-semibold text-[#063f32] transition hover:bg-[#e1c05a] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && (
                <Loader2 className="h-5 w-5 animate-spin" />
              )}

              {loading
                ? "Åbner Stripe..."
                : connected
                  ? "Fortsæt Stripe-onboarding"
                  : "Forbind Stripe-konto"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}