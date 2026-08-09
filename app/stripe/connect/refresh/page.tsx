"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { supabase } from "@/lib/supabase";

export default function StripeConnectRefreshPage() {
  const [message, setMessage] = useState(
    "Opretter et nyt Stripe-link..."
  );

  useEffect(() => {
    void restartOnboarding();
  }, []);

  async function restartOnboarding() {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session) {
        window.location.replace(
          "/login?redirect=/stripe/connect/refresh"
        );
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
            "Stripe-linket kunne ikke oprettes."
        );
      }

      window.location.replace(result.url);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Stripe-onboarding kunne ikke genstartes."
      );
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f5ee] px-5">
      <div className="text-center">
        <Loader2 className="mx-auto h-9 w-9 animate-spin text-[#063f32]" />

        <p className="mt-4 text-stone-600">
          {message}
        </p>
      </div>
    </main>
  );
}