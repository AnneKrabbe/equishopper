import Link from "next/link";

import Header from "@/components/home/Header";

const sections = [
  {
    id: "hvad-er-cookies",
    title: "1. Hvad er cookies?",
    content: (
      <>
        <p>
          Cookies og lignende teknologier er små datafiler, som gemmes på din
          enhed, når du bruger en hjemmeside.
        </p>
        <p>
          De kan blandt andet bruges til at få siden til at fungere, huske dine
          valg og beskytte din konto.
        </p>
      </>
    ),
  },
  {
    id: "vores-brug",
    title: "2. Sådan bruger Equishopper cookies",
    content: (
      <>
        <p>
          Equishopper bruger teknisk nødvendige cookies og lignende teknologier
          for at:
        </p>
        <ul>
          <li>holde dig sikkert logget ind</li>
          <li>beskytte din konto og platformen mod misbrug</li>
          <li>huske nødvendige valg under dit besøg</li>
          <li>gennemføre betalinger sikkert via Stripe</li>
        </ul>
        <p>
          Tekniske nødvendige cookies kan ikke fravælges, fordi platformen ellers
          ikke kan fungere korrekt.
        </p>
      </>
    ),
  },
  {
    id: "leverandoerer",
    title: "3. Leverandører",
    content: (
      <>
        <p>Vi anvender blandt andet:</p>
        <ul>
          <li>Supabase til login, sikkerhed og opbevaring af brugerdata</li>
          <li>Stripe til sikker behandling af betalinger</li>
        </ul>
        <p>
          Disse leverandører kan anvende nødvendige cookies eller lignende
          teknologier som en del af deres tjenester.
        </p>
      </>
    ),
  },
  {
    id: "statistik",
    title: "4. Statistik og markedsføring",
    content: (
      <>
        <p>
          Equishopper anvender på nuværende tidspunkt ikke valgfrie cookies til
          statistik, personalisering eller markedsføring.
        </p>
        <p>
          Hvis vi senere tager sådanne cookies i brug, vil du blive bedt om
          samtykke, før de aktiveres.
        </p>
      </>
    ),
  },
  {
    id: "styring",
    title: "5. Styring og sletning af cookies",
    content: (
      <>
        <p>
          Du kan slette eller blokere cookies i din browsers indstillinger.
        </p>
        <p>
          Hvis du blokerer teknisk nødvendige cookies, kan dele af Equishopper
          holde op med at fungere, og du kan eksempelvis få problemer med login
          eller betaling.
        </p>
      </>
    ),
  },
  {
    id: "aendringer",
    title: "6. Ændringer",
    content: (
      <>
        <p>Vi kan opdatere denne cookiepolitik.</p>
        <p>
          Den seneste version vil altid være tilgængelig på Equishoppers
          hjemmeside.
        </p>
      </>
    ),
  },
  {
    id: "kontakt",
    title: "7. Kontakt",
    content: (
      <>
        <p>
          Har du spørgsmål om vores brug af cookies, kan du kontakte os på:
        </p>
        <p>
          <a
            href="mailto:support@equishopper.dk"
            className="font-semibold text-[#063f32] underline decoration-[#d4af37] underline-offset-4 transition hover:text-[#0b5a47]"
          >
            support@equishopper.dk
          </a>
        </p>
      </>
    ),
  },
];

export default function CookiepolitikPage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#f8f5ee]">
        <section className="bg-[#063f32] px-4 pb-20 pt-36 sm:px-6 sm:pb-24 sm:pt-40 lg:px-8">
          <div className="mx-auto w-full max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#d4af37]">
              Juridisk
            </p>

            <h1 className="mt-5 max-w-3xl font-serif text-5xl leading-[1.05] text-white sm:text-6xl lg:text-7xl">
              Cookiepolitik
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/70 sm:text-xl">
              Her kan du læse, hvordan Equishopper bruger cookies og lignende
              teknologier.
            </p>

            <p className="mt-6 text-sm text-white/50">
              Senest opdateret: 2. august 2026
            </p>
          </div>
        </section>

        <section className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
          <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="hidden lg:block">
              <div className="sticky top-32 rounded-[26px] border border-[#e7e1d7] bg-white p-5 shadow-[0_16px_50px_rgba(35,45,40,0.05)]">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#d4af37]">
                  Indhold
                </p>

                <nav className="mt-4 space-y-1">
                  {sections.map((section, index) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className="flex gap-3 rounded-xl px-3 py-2 text-sm text-stone-600 transition hover:bg-[#f4f1e9] hover:text-[#063f32]"
                    >
                      <span className="font-semibold text-[#063f32]">
                        {index + 1}.
                      </span>
                      <span>{section.title.replace(/^\d+\.\s*/, "")}</span>
                    </a>
                  ))}
                </nav>
              </div>
            </aside>

            <article className="rounded-[30px] border border-[#e7e1d7] bg-white p-6 shadow-[0_18px_60px_rgba(35,45,40,0.07)] sm:p-8 lg:p-10">
              <div className="mb-10 rounded-2xl border border-[#eadfcb] bg-[#fbfaf7] p-5 text-sm leading-6 text-stone-600">
                Denne politik beskriver den nuværende brug af teknisk nødvendige
                cookies. Læs også vores{" "}
                <Link
                  href="/privatlivspolitik"
                  className="font-semibold text-[#063f32] underline decoration-[#d4af37] underline-offset-4 transition hover:text-[#0b5a47]"
                >
                  privatlivspolitik
                </Link>
                .
              </div>

              <div className="space-y-12">
                {sections.map((section) => (
                  <section
                    key={section.id}
                    id={section.id}
                    className="scroll-mt-32"
                  >
                    <h2 className="font-serif text-3xl font-bold text-[#063f32]">
                      {section.title}
                    </h2>

                    <div className="mt-5 space-y-4 text-base leading-7 text-stone-700 [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-2">
                      {section.content}
                    </div>
                  </section>
                ))}
              </div>
            </article>
          </div>
        </section>
      </main>
    </>
  );
}