import Link from "next/link";

import Header from "@/components/home/Header";

const sections = [
  {
    id: "medlemskab",
    title: "1. Medlemskab",
    content: (
      <>
        <p>Det er gratis at oprette en bruger og bruge Equishopper.</p>
        <p>
          Du betaler først gebyrer, når du køber eller sælger en vare gennem
          platformen.
        </p>
        <p>Der betales ingen abonnements- eller oprettelsesgebyrer.</p>
      </>
    ),
  },
  {
    id: "salg",
    title: "2. Gebyr ved salg",
    content: (
      <>
        <p>
          Når du sælger en vare gennem Equishopper, betaler du{" "}
          <span className="font-semibold text-[#063f32]">
            2 % af salgsprisen
          </span>
          .
        </p>
        <p>Gebyret fratrækkes automatisk, når handlen gennemføres.</p>
      </>
    ),
  },
  {
    id: "koeberbeskyttelse",
    title: "3. Køberbeskyttelse",
    content: (
      <>
        <p>
          Når du køber en vare gennem Equishopper, betaler du{" "}
          <span className="font-semibold text-[#063f32]">
            3 % af vareprisen + 5 kr.
          </span>
        </p>
        <p>
          Køberbeskyttelsen bidrager til en tryg handel og omfatter blandt
          andet sikker betaling, håndtering af tvister og support.
        </p>
        <p>
          Du kan læse mere om, hvordan vi behandler uenigheder mellem køber og
          sælger på siden{" "}
          <Link
            href="/hjaelp/tvister"
            className="font-semibold text-[#063f32] underline decoration-[#d4af37] underline-offset-4 transition hover:text-[#0b5a47]"
          >
            Sådan behandler vi tvister
          </Link>
          .
        </p>
      </>
    ),
  },
  {
    id: "fragt",
    title: "4. Fragt",
    content: (
      <>
        <p>
          Ved forsendelse beregnes fragtprisen ud fra den DAO-pakkeklasse,
          som sælger har valgt til varen.
        </p>
        <p>
          Den aktuelle fragtpris og leveringsmetode vises altid tydeligt,
          inden betalingen gennemføres.
        </p>
        <p>
          Fragt via Equishopper er ikke muligt for pakker over 15 kg.
        </p>
      </>
    ),
  },
  {
    id: "eksempel",
    title: "5. Eksempel",
    content: (
      <>
        <p className="font-semibold text-[#063f32]">
          En vare sælges til 1.000 kr.
        </p>

        <div className="overflow-hidden rounded-2xl border border-[#eadfcb]">
          <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-[#eadfcb] bg-[#fbfaf7] px-4 py-3 font-semibold text-[#063f32]">
            <span>Køber</span>
            <span>Beløb</span>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-[#eadfcb] px-4 py-3">
            <span>Varepris</span>
            <span>1.000 kr.</span>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-[#eadfcb] px-4 py-3">
            <span>Køberbeskyttelse (3 % + 5 kr.)</span>
            <span>35 kr.</span>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-4 bg-[#fbfaf7] px-4 py-3 font-semibold text-[#063f32]">
            <span>Køber betaler i alt</span>
            <span>1.035 kr.</span>
          </div>
        </div>

        <p className="mt-3 text-sm italic text-stone-500">
          * Hertil kommer eventuelle udgifter til fragt.
        </p>

        <div className="overflow-hidden rounded-2xl border border-[#eadfcb]">
          <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-[#eadfcb] bg-[#fbfaf7] px-4 py-3 font-semibold text-[#063f32]">
            <span>Sælger</span>
            <span>Beløb</span>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-[#eadfcb] px-4 py-3">
            <span>Salgspris</span>
            <span>1.000 kr.</span>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-[#eadfcb] px-4 py-3">
            <span>Gebyr ved salg (2 %)</span>
            <span>20 kr.</span>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-4 bg-[#fbfaf7] px-4 py-3 font-semibold text-[#063f32]">
            <span>Udbetaling til sælger</span>
            <span>980 kr.</span>
          </div>
        </div>
      </>
    ),
  },
  {
    id: "betaling",
    title: "6. Betaling",
    content: (
      <>
        <p>Alle betalinger gennemføres sikkert via Stripe.</p>
      </>
    ),
  },
  {
    id: "aendringer",
    title: "7. Ændringer",
    content: (
      <>
        <p>Equishopper kan ændre priser og gebyrer.</p>
        <p>
          Den til enhver tid gældende prisliste findes på denne side.
        </p>
      </>
    ),
  },
  {
    id: "kontakt",
    title: "8. Kontakt",
    content: (
      <>
        <p>
          Har du spørgsmål om priser eller gebyrer, er du velkommen til at
          kontakte os på:
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

export default function PriserPage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#f8f5ee]">
        <section className="bg-[#063f32] px-4 pb-20 pt-36 sm:px-6 sm:pb-24 sm:pt-40 lg:px-8">
          <div className="mx-auto w-full max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#d4af37]">
              Priser
            </p>

            <h1 className="mt-5 max-w-3xl font-serif text-5xl leading-[1.05] text-white sm:text-6xl lg:text-7xl">
              Priser og gebyrer
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/70 sm:text-xl">
              Ingen skjulte gebyrer. Du betaler kun, når du køber eller sælger
              en vare.
            </p>

            <p className="mt-6 text-sm text-white/50">
              Senest opdateret: 7. august 2026
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
                Alle priser vises tydeligt, inden en handel gennemføres. Læs
                også vores{" "}
                <Link
                  href="/handelsbetingelser"
                  className="font-semibold text-[#063f32] underline decoration-[#d4af37] underline-offset-4 transition hover:text-[#0b5a47]"
                >
                  handelsbetingelser
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