"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

import Header from "@/components/home/Header";
import { supabase } from "@/lib/supabase";

type ConnectStatus = {
  connected: boolean;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
};

export default function StripeConnectReturnPage() {
  const [loading, setLoading] = useState(true);

  const [status, setStatus] =
    useState<ConnectStatus | null>(null);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    void loadStatus();
  }, []);

  async function loadStatus() {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session) {
        window.location.replace(
          "/login?redirect=/stripe/connect/return"
        );
        return;
      }

      const response = await fetch(
        "/api/stripe/connect/status",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const result = (await response.json()) as
        | ConnectStatus
        | { error: string };

      if (!response.ok || "error" in result) {
        throw new Error(
          "error" in result
            ? result.error
            : "Stripe-status kunne ikke hentes."
        );
      }

      setStatus(result);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Stripe-status kunne ikke hentes."
      );
    } finally {
      setLoading(false);
    }
  }

  const ready =
    status?.detailsSubmitted &&
    status?.payoutsEnabled;

  return (
    <main className="min-h-screen bg-[#f8f5ee]">
      <Header />

      <section className="mx-auto max-w-2xl px-5 pb-20 pt-36">
        <div className="rounded-[30px] border border-[#e7e1d7] bg-white p-8 text-center shadow-sm sm:p-10">
          {loading ? (
            <>
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#063f32]" />

              <h1 className="mt-5 font-serif text-3xl text-[#063f32]">
                Kontrollerer Stripe-kontoen
              </h1>
            </>
          ) : errorMessage ? (
            <>
              <AlertTriangle className="mx-auto h-12 w-12 text-red-600" />

              <h1 className="mt-5 font-serif text-3xl text-[#063f32]">
                Stripe kunne ikke kontrolleres
              </h1>

              <p className="mt-3 text-stone-600">
                {errorMessage}
              </p>
            </>
          ) : ready ? (
            <>
              <CheckCircle2 className="mx-auto h-14 w-14 text-[#0b5a47]" />

              <h1 className="mt-5 font-serif text-3xl text-[#063f32]">
                Klar til udbetaling
              </h1>

              <p className="mt-3 text-stone-600">
                Din Stripe-konto er forbundet og klar
                til at modtage udbetalinger.
              </p>
            </>
          ) : (
            <>
              <AlertTriangle className="mx-auto h-12 w-12 text-amber-600" />

              <h1 className="mt-5 font-serif text-3xl text-[#063f32]">
                Onboarding mangler
              </h1>

              <p className="mt-3 text-stone-600">
                Stripe-kontoen er oprettet, men mangler
                stadig oplysninger eller godkendelse.
              </p>
            </>
          )}

          <Link
            href="/profil"
            className="mt-7 inline-flex rounded-full bg-[#d4af37] px-7 py-3 font-semibold text-[#063f32]"
          >
            Gå til min profil
          </Link>
        </div>
      </section>
    </main>
  );
}