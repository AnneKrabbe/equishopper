import Link from "next/link";
import {
  CheckCircle2,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";

import Header from "@/components/home/Header";

type SuccessPageProps = {
  searchParams: Promise<{
    session_id?: string;
  }>;
};

export default async function CheckoutSuccessPage({
  searchParams,
}: SuccessPageProps) {
  const { session_id: sessionId } = await searchParams;

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
            Varen er reserveret til dig.
          </p>

          <div className="mt-8 grid gap-4 text-left sm:grid-cols-2">
            <div className="rounded-2xl bg-[#f8f6f1] p-5">
              <PackageCheck className="h-6 w-6 text-[#0b5a47]" />

              <h2 className="mt-3 font-semibold text-[#063f32]">
                Ordren er registreret
              </h2>

              <p className="mt-2 text-sm leading-6 text-stone-600">
                Købs- og leveringsoplysningerne er gemt på ordren.
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

          {sessionId && (
            <p className="mt-6 break-all text-xs leading-5 text-stone-400">
              Betalingsreference: {sessionId}
            </p>
          )}

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full bg-[#d4af37] px-7 py-3.5 font-semibold text-[#063f32] transition hover:bg-[#e1c05a]"
            >
              Gå til forsiden
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