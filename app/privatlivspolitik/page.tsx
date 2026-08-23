import Header from "@/components/home/Header";

const sections = [
  {
    id: "velkommen",
    title: "1. Velkommen",
    content: (
      <>
        <p>
          Equishopper respekterer dit privatliv og behandler dine
          personoplysninger i overensstemmelse med gældende
          databeskyttelseslovgivning.
        </p>

        <p>
          Denne privatlivspolitik beskriver, hvilke oplysninger vi indsamler,
          hvorfor vi gør det, og hvilke rettigheder du har.
        </p>
      </>
    ),
  },

  {
    id: "dataansvarlig",
    title: "2. Dataansvarlig",
    content: (
      <>
        <p className="font-semibold text-[#063f32]">Equishopper</p>

        <p>
          Duevej 50, 3. th.
          <br />
          2000 Frederiksberg
          <br />
          Danmark
        </p>

        <p>
          CVR: 46667247
          <br />
          E-mail:{" "}
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

  {
    id: "oplysninger",
    title: "3. Hvilke oplysninger indsamler vi?",
    content: (
      <>
        <p>Når du bruger Equishopper, kan vi behandle følgende oplysninger:</p>

        <ul>
          <li>navn og brugernavn</li>
          <li>e-mailadresse og telefonnummer</li>
          <li>adresse, postnummer og by</li>
          <li>profilbillede, hvis du vælger at uploade et</li>
          <li>oplysninger om annoncer, køb og salg</li>
          <li>beskeder, anmeldelser og oplysninger om tvister</li>
          <li>tekniske oplysninger om din brug af platformen</li>
        </ul>

        <p>
          Vi opbevarer ikke dine betalingskortoplysninger. Betalinger behandles
          af Stripe eller en anden godkendt betalingsudbyder.
        </p>
      </>
    ),
  },

  {
    id: "formaal",
    title: "4. Hvad bruger vi oplysningerne til?",
    content: (
      <>
        <p>Vi bruger dine oplysninger for at:</p>

        <ul>
          <li>oprette og administrere din konto</li>
          <li>gennemføre køb og salg</li>
          <li>håndtere betalinger og levering</li>
          <li>levere køberbeskyttelse og behandle tvister</li>
          <li>kommunikere med dig</li>
          <li>forbedre platformen</li>
          <li>forebygge svindel og misbrug</li>
          <li>overholde gældende lovgivning</li>
        </ul>
      </>
    ),
  },

  {
    id: "deling",
    title: "5. Hvem deler vi oplysninger med?",
    content: (
      <>
        <p>
          Vi deler kun personoplysninger med andre, når det er nødvendigt for
          at levere Equishoppers tjenester, gennemføre en handel, overholde
          vores retlige forpligtelser eller beskytte platformen mod misbrug.
        </p>

        <p>
          Vi anvender blandt andet følgende tekniske leverandører og
          samarbejdspartnere:
        </p>

        <ul>
          <li>
            <strong>Supabase</strong> – database, brugerlogin,
            autentifikation samt opbevaring af billeder og andre platformdata.
          </li>

          <li>
            <strong>Stripe</strong> – behandling af betalinger,
            betalingskonti, Stripe Connect og udbetalinger til sælgere.
            Equishopper opbevarer ikke selv brugernes kortoplysninger.
          </li>

          <li>
            <strong>Vercel</strong> – hosting, teknisk drift og levering af
            Equishoppers hjemmeside og applikation.
          </li>

          <li>
            <strong>Resend</strong> – udsendelse af transaktionsmails og andre
            nødvendige e-mails fra Equishopper.
          </li>

          <li>
            <strong>Shipmondo</strong> – teknisk behandling af
            fragtinformation og oprettelse af forsendelser.
          </li>

          <li>
            <strong>DAO</strong> – transportør ved forsendelser, herunder
            behandling af nødvendige oplysninger om afsender, modtager,
            levering og tracking.
          </li>

          <li>
            <strong>Google</strong> – tjenester i forbindelse med
            søgemaskineoptimering, produktvisninger og administration af
            Equishoppers synlighed på Google, herunder Google Search Console
            og Google Merchant Center.
          </li>
        </ul>

        <p>
          Afhængigt af den konkrete tjeneste kan leverandørerne behandle
          oplysninger på vegne af Equishopper eller som selvstændigt
          dataansvarlige. Vi deler kun de oplysninger, der er nødvendige for
          det konkrete formål.
        </p>

        <p>
          Vi kan også dele oplysninger med offentlige myndigheder eller andre
          relevante parter, hvis vi er retligt forpligtet til det, eller hvis
          det er nødvendigt for at forebygge svindel, håndtere tvister eller
          beskytte Equishopper og vores brugere.
        </p>

        <p>Vi sælger aldrig dine personoplysninger.</p>
      </>
    ),
  },

  {
    id: "opbevaring",
    title: "6. Opbevaring og sletning af oplysninger",
    content: (
      <>
        <p>
          Vi opbevarer dine personoplysninger, så længe det er nødvendigt for
          at drive din konto og gennemføre handler.
        </p>

        <p>
          Hvis du sletter din konto, slettes eller anonymiseres dine
          personoplysninger, medmindre Equishopper er forpligtet til at bevare
          bestemte oplysninger efter gældende lovgivning.
        </p>

        <p>
          Oplysninger kan eksempelvis blive bevaret af hensyn til bogføring,
          dokumentation, sikkerhed, igangværende tvister eller andre retlige
          forpligtelser.
        </p>

        <p>
          Oplysninger om gennemførte handler kan derfor blive opbevaret i den
          periode, som lovgivningen kræver.
        </p>
      </>
    ),
  },

  {
    id: "rettigheder",
    title: "7. Dine rettigheder",
    content: (
      <>
        <p>Du har blandt andet ret til at:</p>

        <ul>
          <li>få indsigt i dine personoplysninger</li>
          <li>få urigtige oplysninger rettet</li>
          <li>få oplysninger slettet, når det er muligt</li>
          <li>gøre indsigelse mod visse behandlinger</li>
          <li>få begrænset behandlingen i visse tilfælde</li>
          <li>få udleveret dine oplysninger i et almindeligt anvendt format</li>
        </ul>

        <p>
          Du kan kontakte os på support@equishopper.dk, hvis du ønsker at gøre
          brug af dine rettigheder.
        </p>
      </>
    ),
  },

  {
    id: "sikkerhed",
    title: "8. Sikkerhed",
    content: (
      <>
        <p>
          Vi beskytter dine oplysninger med passende tekniske og organisatoriske
          sikkerhedsforanstaltninger.
        </p>

        <p>
          Kun personer og leverandører med et sagligt behov har adgang til
          personoplysninger.
        </p>
      </>
    ),
  },

  {
    id: "aendringer",
    title: "9. Ændringer",
    content: (
      <>
        <p>Vi kan opdatere denne privatlivspolitik.</p>

        <p>
          Den seneste version vil altid være tilgængelig på Equishoppers
          hjemmeside.
        </p>
      </>
    ),
  },

  {
    id: "kontakt",
    title: "10. Kontakt",
    content: (
      <>
        <p>
          Hvis du har spørgsmål om vores behandling af personoplysninger, er du
          velkommen til at kontakte os på:
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

export default function PrivatlivspolitikPage() {
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
              Privatlivspolitik
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/70 sm:text-xl">
              Her kan du læse, hvordan Equishopper behandler og beskytter dine
              personoplysninger.
            </p>

            <p className="mt-6 text-sm text-white/50">
              Senest opdateret: 23. august 2026
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

                      <span>
                        {section.title.replace(/^\d+\.\s*/, "")}
                      </span>
                    </a>
                  ))}
                </nav>
              </div>
            </aside>

            <article className="rounded-[30px] border border-[#e7e1d7] bg-white p-6 shadow-[0_18px_60px_rgba(35,45,40,0.07)] sm:p-8 lg:p-10">
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