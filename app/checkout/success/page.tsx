"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  MessageCircle,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";

import Header from "@/components/home/Header";
import ContactSellerButton from "@/components/listings/ContactSellerButton";
import { supabase } from "@/lib/supabase";

type OrderSummary = {
  id: string;
  seller_id: string;
  shipping_method: string | null;
  payment_status: string | null;
};

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<CheckoutSuccessFallback />}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [loadingOrder, setLoadingOrder] = useState(Boolean(sessionId));
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [listingId, setListingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOrder() {
      if (!sessionId) {
        setLoadingOrder(false);
        return;
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user || cancelled) {
          setLoadingOrder(false);
          return;
        }

        const { data: orderData, error: orderError } = await supabase
          .from("orders")
          .select("id, seller_id, shipping_method, payment_status")
          .eq("buyer_id", user.id)
          .eq("stripe_checkout_session_id", sessionId)
          .maybeSingle();

        if (orderError) {
          console.error("Kunne ikke hente ordren efter betaling:", orderError);
          return;
        }

        if (!orderData || cancelled) {
          return;
        }

        setOrder(orderData as OrderSummary);

        const { data: itemData, error: itemError } = await supabase
          .from("order_items")
          .select("listing_id")
          .eq("order_id", orderData.id)
          .order("id", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (itemError) {
          console.error("Kunne ikke hente ordrevaren efter betaling:", itemError);
          return;
        }

        if (!cancelled) {
          setListingId(itemData?.listing_id ?? null);
        }
      } catch (error) {
        console.error("Kunne ikke indlæse købsbekræftelsen:", error);
      } finally {
        if (!cancelled) {
          setLoadingOrder(false);
        }
      }
    }

    void loadOrder();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const isPickup = order?.shipping_method === "pickup";

  return (
    <main className="min-h-screen bg-[#f8f6f1]">
      <Header />

      <section className="mx-auto max-w-2xl px-5 pb-20 pt-32 md:pt-40">
        <div className="rounded-[30px] border border-[#eadfcb] bg-white p-8 text-center shadow-sm md:p-12">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#063f32] text-[#d4af37]">
            <CheckCircle2 className="h-11 w-11" />
          </div>

          <p className="mt-7 text-sm uppercase tracking-[0.22em] text-[#b79a3d]">
            Betaling gennemført
          </p>

          <h1 className="mt-3 font-serif text-4xl text-[#063f32] md:text-5xl">
            Tak for dit køb
          </h1>

          <p className="mx-auto mt-5 max-w-lg leading-7 text-stone-600">
            Din betaling er modtaget, og ordren bliver nu behandlet.
          </p>

          <div className="mt-8 grid gap-4 text-left sm:grid-cols-2">
            <div className="rounded-2xl bg-[#f8f6f1] p-5">
              <PackageCheck className="h-6 w-6 text-[#0b5a47]" />

              <h2 className="mt-3 font-semibold text-[#063f32]">
                Ordren er registreret
              </h2>

              <p className="mt-2 text-sm leading-6 text-stone-600">
                Købs- og leveringsoplysningerne er gemt under Mine ordrer.
              </p>
            </div>

            <div className="rounded-2xl bg-[#f8f6f1] p-5">
              <ShieldCheck className="h-6 w-6 text-[#0b5a47]" />

              <h2 className="mt-3 font-semibold text-[#063f32]">
                Sikker betaling
              </h2>

              <p className="mt-2 text-sm leading-6 text-stone-600">
                Betalingen er gennemført sikkert via Stripe.
              </p>
            </div>
          </div>

          {loadingOrder ? (
            <div className="mt-7 flex items-center justify-center gap-2 text-sm text-stone-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Henter ordreoplysninger...
            </div>
          ) : isPickup ? (
            <div className="mt-7 rounded-2xl border border-[#d4af37]/40 bg-[#fffaf0] p-5 text-left">
              <div className="flex items-start gap-3">
                <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#0b5a47]" />
                <div>
                  <h2 className="font-semibold text-[#063f32]">
                    Aftal afhentning med sælger
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-stone-600">
                    Skriv til sælger for at aftale nærmere om tid og sted for
                    afhentning.
                  </p>
                </div>
              </div>

              {order && listingId && (
                <div className="mt-4">
                  <ContactSellerButton
                    listingId={listingId}
                    sellerId={order.seller_id}
                  />
                </div>
              )}
            </div>
          ) : order && listingId ? (
            <div className="mt-7">
              <ContactSellerButton
                listingId={listingId}
                sellerId={order.seller_id}
              />
            </div>
          ) : null}

          {sessionId && (
            <p className="mt-6 break-all text-xs leading-5 text-stone-400">
              Betalingsreference: {sessionId}
            </p>
          )}

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/mine-ordrer"
              className="inline-flex items-center justify-center rounded-full bg-[#d4af37] px-7 py-3.5 font-semibold text-[#063f32] transition hover:bg-[#e1c05a]"
            >
              Se Mine ordrer
            </Link>

            <Link
              href="/annoncer"
              className="inline-flex items-center justify-center rounded-full border border-[#063f32] px-7 py-3.5 font-semibold text-[#063f32] transition hover:bg-[#063f32] hover:text-white"
            >
              Se flere annoncer
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function CheckoutSuccessFallback() {
  return (
    <main className="min-h-screen bg-[#f8f6f1]">
      <Header />

      <section className="mx-auto max-w-2xl px-5 pb-20 pt-32 md:pt-40">
        <div className="rounded-[30px] border border-[#eadfcb] bg-white p-8 text-center shadow-sm md:p-12">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#063f32] text-[#d4af37]">
            <Loader2 className="h-10 w-10 animate-spin" />
          </div>

          <h1 className="mt-7 font-serif text-4xl text-[#063f32] md:text-5xl">
            Henter dit køb
          </h1>

          <p className="mx-auto mt-5 max-w-lg leading-7 text-stone-600">
            Vi gør din købsbekræftelse klar...
          </p>
        </div>
      </section>
    </main>
  );
}
