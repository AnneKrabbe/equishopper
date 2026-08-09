import Link from "next/link";

import Header from "@/components/home/Header";

const buyerTips = [
  {
    title: "Gennemgå annoncen grundigt",
    text: "Læs hele beskrivelsen, se alle billeder og kontrollér størrelse, mærke og stand. Hvis du er i tvivl om noget, så spørg sælger, inden du køber.",
  },
  {
    title: "Forvent ikke en ny vare",
    text: "De fleste varer på Equishopper er brugte. Mindre brugsspor og almindeligt slid kan være forventeligt, hvis det er beskrevet eller tydeligt fremgår af billederne.",
  },
  {
    title: "Gennemgå varen ved modtagelsen",
    text: "Hvis varen er sendt med fragt, bør du gennemgå den hurtigst muligt efter modtagelsen. Kontrollér blandt andet, at du har modtaget den rigtige vare, at størrelse og model stemmer, og at varen svarer til annoncen.",
  },
  {
    title: "Gem emballagen ved skade",
    text: "Hvis pakken eller varen ser beskadiget ud ved modtagelsen, bør du gemme emballagen, indtil sagen er afklaret. Emballagen kan være vigtig dokumentation ved en mulig transportskade.",
  },
];

const sellerTips = [
  {
    title: "Beskriv varen ærligt",
    text: "Jo mere præcis beskrivelsen er, desto mindre er risikoen for misforståelser. Oplys altid kendte fejl, slid, reparationer, mangler og hvis noget ikke fungerer perfekt.",
  },
  {
    title: "Tag gode billeder",
    text: "Vis hele varen og tag også nærbilleder af fejl og brugsspor. Det skaber tillid og kan være vigtig dokumentation senere.",
  },
  {
    title: "Vælg den rigtige pakkestørrelse",
    text: "Vælg DAO-pakkeklassen ud fra den færdigpakkede vares samlede vægt. Fragt via Equishopper er ikke muligt for pakker over 15 kg.",
  },
  {
    title: "Pak varen forsvarligt",
    text: "Brug egnet emballage og tilstrækkelig beskyttelse. Sælger er ansvarlig for at følge fragtpartnerens gældende regler om blandt andet emballage, mål, vægt og forbudte varer.",
  },
  {
    title: "Send varen inden fristen",
    text: "Afsend varen inden for den frist, der gælder for ordren, og følg de anvisninger, Equishopper viser i forbindelse med forsendelsen.",
  },
];

const sharedTips = [
  {
    title: "Kommunikér gennem Equishopper",
    text: "Hold så vidt muligt kommunikationen om varen og handlen på platformen. Det gør forløbet mere overskueligt og kan være relevant dokumentation, hvis der senere opstår en tvist.",
  },
  {
    title: "Upload den dokumentation, du bliver bedt om",
    text: "Husk at uploade den dokumentation, Equishopper efterspørger i forbindelse med forsendelse, modtagelse eller en eventuel tvistsag.",
  },
  {
    title: "Reagér hurtigt, hvis noget er galt",
    text: "Hvis der opstår et problem med en forsendelse eller den modtagne vare, bør du følge de frister og instruktioner, der fremgår af ordren og Equishoppers handelsbetingelser.",
  },
];

export default function SikkerHandelPage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#f8f5ee]">
        <section className="bg-[#063f32] px-4 pb-20 pt-36 sm:px-6 sm:pb-24 sm:pt-40 lg:px-8">
          <div className="mx-auto w-full max-w-5xl">
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#d4af37]">
              Hjælp & Tryghed
            </p>

            <h1 className="mt-5 max-w-4xl font-serif text-5xl leading-[1.02] text-white sm:text-6xl lg:text-7xl">
              Guide til sikker handel
            </h1>

            <p className="mt-7 max-w-3xl text-lg leading-8 text-white/75 sm:text-xl">
              En tryg handel begynder, før du køber eller sælger. Her finder
              du enkle råd, der kan forebygge misforståelser og gøre
              handelsforløbet mere sikkert for begge parter.
            </p>
          </div>
        </section>

        <section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div className="mx-auto w-full max-w-5xl space-y-16">
            <section>
              <SectionIntro
                eyebrow="Til købere"
                title="Før og efter dit køb"
                text="Læs annoncen grundigt og reagér hurtigt, hvis den modtagne vare ikke svarer til det, der blev aftalt."
              />

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {buyerTips.map((tip) => (
                  <TipCard key={tip.title} {...tip} />
                ))}
              </div>

              <div className="mt-5 rounded-[24px] border border-[#d4af37]/30 bg-[#fffdf7] p-6">
                <h3 className="font-serif text-2xl font-bold text-[#063f32]">
                  Hvis der opstår et problem
                </h3>
                <p className="mt-3 leading-7 text-stone-600">
                  Opret kun en tvist, hvis der er et reelt problem med
                  handlen. Vi anbefaler, at du først læser siden{" "}
                  <Link
                    href="/hjaelp/tvister"
                    className="font-semibold text-[#063f32] underline decoration-[#d4af37] underline-offset-4 transition hover:text-[#0b5a47]"
                  >
                    Sådan behandler vi tvister
                  </Link>
                  .
                </p>
              </div>
            </section>

            <section>
              <SectionIntro
                eyebrow="Til sælgere"
                title="En god handel starter med en god annonce"
                text="Tydelige oplysninger, retvisende billeder og forsvarlig emballering mindsker risikoen for både misforståelser og tvister."
              />

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {sellerTips.map((tip) => (
                  <TipCard key={tip.title} {...tip} />
                ))}
              </div>
            </section>

            <section className="rounded-[32px] bg-[#063f32] p-7 text-white sm:p-9">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#d4af37]">
                For begge parter
              </p>

              <h2 className="mt-3 font-serif text-3xl font-bold sm:text-4xl">
                Dokumentation og tydelig kommunikation
              </h2>

              <div className="mt-7 grid gap-4 md:grid-cols-3">
                {sharedTips.map((tip) => (
                  <div
                    key={tip.title}
                    className="rounded-[22px] border border-white/15 bg-white/10 p-5"
                  >
                    <h3 className="font-serif text-xl font-bold text-white">
                      {tip.title}
                    </h3>

                    <p className="mt-3 text-sm leading-6 text-white/70">
                      {tip.text}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-5 md:grid-cols-2">
              <article className="rounded-[28px] border border-[#e7e1d7] bg-white p-7 shadow-[0_14px_45px_rgba(35,45,40,0.05)]">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b79a3d]">
                  Køberbeskyttelse
                </p>

                <h2 className="mt-3 font-serif text-3xl font-bold text-[#063f32]">
                  Handler gennemført på Equishopper
                </h2>

                <p className="mt-4 leading-7 text-stone-600">
                  Handler, der gennemføres og betales via Equishopper, er
                  omfattet af Equishoppers køberbeskyttelse efter de gældende
                  handelsbetingelser.
                </p>

                <Link
                  href="/handelsbetingelser#koeberbeskyttelse"
                  className="mt-5 inline-flex font-semibold text-[#0b5a47] underline decoration-[#d4af37] underline-offset-4"
                >
                  Læs om køberbeskyttelse
                </Link>
              </article>

              <article className="rounded-[28px] border border-[#e7e1d7] bg-white p-7 shadow-[0_14px_45px_rgba(35,45,40,0.05)]">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b79a3d]">
                  Tvister
                </p>

                <h2 className="mt-3 font-serif text-3xl font-bold text-[#063f32]">
                  Hvis køber og sælger er uenige
                </h2>

                <p className="mt-4 leading-7 text-stone-600">
                  På vores tvistside kan du se processen, hvilke oplysninger
                  vi normalt lægger vægt på, og eksempler på typiske
                  afgørelser.
                </p>

                <Link
                  href="/hjaelp/tvister"
                  className="mt-5 inline-flex font-semibold text-[#0b5a47] underline decoration-[#d4af37] underline-offset-4"
                >
                  Sådan behandler vi tvister
                </Link>
              </article>
            </section>

            <section className="rounded-[32px] border border-[#d4af37]/40 bg-[#fffdf7] p-7 sm:p-9">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#b79a3d]">
                    Har du brug for hjælp?
                  </p>

                  <h2 className="mt-2 font-serif text-3xl font-bold text-[#063f32]">
                    Vi hjælper gerne
                  </h2>

                  <p className="mt-3 max-w-2xl leading-7 text-stone-600">
                    Hvis du ikke kan finde svar i vores hjælpesider, er du
                    velkommen til at kontakte Equishopper.
                  </p>
                </div>

                <a
                  href="mailto:support@equishopper.dk"
                  className="inline-flex flex-none items-center justify-center whitespace-nowrap rounded-full bg-[#063f32] px-6 py-3.5 font-semibold text-white transition hover:bg-[#052f26]"
                >
                  Kontakt os
                </a>
              </div>
            </section>
          </div>
        </section>
      </main>
    </>
  );
}

function SectionIntro({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b79a3d]">
        {eyebrow}
      </p>

      <h2 className="mt-3 max-w-3xl font-serif text-3xl font-bold leading-tight text-[#063f32] sm:text-4xl">
        {title}
      </h2>

      <p className="mt-4 max-w-3xl text-base leading-7 text-stone-600">
        {text}
      </p>
    </div>
  );
}

function TipCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <article className="rounded-[26px] border border-[#e7e1d7] bg-white p-6 shadow-[0_14px_45px_rgba(35,45,40,0.05)]">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#edf5f0] text-[#0b5a47]">
        ✓
      </div>

      <h3 className="mt-4 font-serif text-2xl font-bold text-[#063f32]">
        {title}
      </h3>

      <p className="mt-3 leading-7 text-stone-600">{text}</p>
    </article>
  );
}