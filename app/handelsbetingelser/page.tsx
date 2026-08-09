import Header from "@/components/home/Header";

const sections = [
  {
    id: "velkommen",
    title: "1. Velkommen til Equishopper",
    content: (
      <>
        <p>
          Equishopper er en dansk online markedsplads, hvor private kan købe og
          sælge brugt rideudstyr på en sikker, enkel og tryg måde.
        </p>
        <p>
          Ved at oprette en konto eller benytte Equishopper accepterer du disse
          handelsbetingelser.
        </p>
      </>
    ),
  },
  {
    id: "om-equishopper",
    title: "2. Om Equishopper",
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
          E-mail: support@equishopper.dk
        </p>
      </>
    ),
  },
  {
    id: "rolle",
    title: "3. Equishoppers rolle",
    content: (
      <>
        <p>Equishopper er en formidlingsplatform.</p>
        <p>
          Equishopper ejer ikke de varer, der annonceres eller sælges på
          platformen, og bliver ikke ejer af varerne. Købsaftalen indgås direkte
          mellem køber og sælger. Equishopper har således ikke ansvar for
          selve varen.
        </p>
        <p>Equishopper stiller platformen til rådighed og tilbyder blandt andet:</p>
        <ul>
          <li>oprettelse og visning af annoncer</li>
          <li>betaling via en ekstern betalingsudbyder, herunder Stripe</li>
          <li>køberbeskyttelse ved handler gennemført via platformen</li>
          <li>kommunikation mellem køber og sælger</li>
          <li>integration med godkendte fragtpartnere</li>
          <li>behandling af tvister ved handler gennemført via platformen</li>
        </ul>
        <p>
          Betalinger behandles af Stripe eller en anden godkendt
          betalingsudbyder. Equishopper opbevarer ikke selv brugernes
          betalingsmidler. Frigivelse, tilbagebetaling og udbetaling sker efter
          det betalingsflow, der gælder for den konkrete handel.
        </p>
      </>
    ),
  },
  {
    id: "brugere",
    title: "4. Hvem kan bruge Equishopper?",
    content: (
      <>
        <p>For at benytte Equishopper skal du:</p>
        <ul>
          <li>have en gyldig e-mailadresse</li>
          <li>oprette en personlig konto</li>
          <li>afgive korrekte og ajourførte oplysninger</li>
          <li>acceptere disse handelsbetingelser</li>
        </ul>
        <p>Hver person må som udgangspunkt kun have én personlig konto.</p>
        <p>
          Ved oprettelse af en konto erklærer du, at du er myndig og har ret til
          at indgå bindende aftaler efter gældende dansk ret.
        </p>
        <p>
          Equishopper kan bede om yderligere oplysninger eller dokumentation for
          at bekræfte en brugers identitet, kontaktoplysninger eller ret til at
          bruge platformen.
        </p>
      </>
    ),
  },
  {
    id: "annoncer",
    title: "5. Varer og annoncer",
    content: (
      <>
        <p>Sælger er ansvarlig for, at annoncen er korrekt og retvisende.</p>
        <p>Du må kun sælge varer, som:</p>
        <ul>
          <li>du ejer og har ret til at sælge</li>
          <li>lovligt må sælges i Danmark</li>
          <li>overholder Equishoppers regler</li>
          <li>beskrives korrekt, herunder med kendte fejl og mangler</li>
          <li>fotograferes med egne, retvisende billeder af den konkrete vare</li>
        </ul>
        <p>
          Det er ikke tilladt at anvende billeder eller beskrivelser, der giver
          et misvisende indtryk af varens stand, mærke, størrelse, ægthed eller
          øvrige egenskaber.
        </p>
        <p>
          Equishopper kan fjerne eller begrænse annoncer, der overtræder disse
          betingelser, platformens regler eller gældende lovgivning.
        </p>
      </>
    ),
  },
  {
    id: "koeb",
    title: "6. Gennemførelse af køb",
    content: (
      <>
        <p>
          Når køber gennemfører betalingen via Equishopper, anses handlen for
          indgået mellem køber og sælger.
        </p>
        <p>Sælger modtager herefter besked om ordren.</p>
        <p>
          Ved forsendelse skal sælger afsende varen senest 5 hverdage efter
          købet.
        </p>
        <p className="font-semibold text-[#063f32]">
          Hvis varen ikke er afsendt inden fristen, annulleres ordren
          automatisk, og køber får det fulde beløb tilbage.
        </p>
      </>
    ),
  },
  {
    id: "betaling",
    title: "7. Betaling, kommission og gebyrer",
    content: (
      <>
        <p>
          Betalinger gennemføres via Stripe eller en anden godkendt
          betalingsudbyder.
        </p>
        <p>Equishopper opkræver:</p>
        <ul>
          <li>en kommission, som fratrækkes sælgers udbetaling</li>
          <li>
            et køberbeskyttelses- og administrationsgebyr, som betales af køber
          </li>
        </ul>
        <p>
          De aktuelle satser fremgår altid af Equishoppers prisside og vises
          tydeligt for både køber og sælger, inden handlen gennemføres.
        </p>
      </>
    ),
  },
  {
    id: "koeberbeskyttelse",
    title: "8. Køberbeskyttelse",
    content: (
      <>
        <p>
          Handler, der gennemføres og betales via Equishopper, er omfattet af
          Equishoppers køberbeskyttelse.
        </p>
        <p>Køberbeskyttelsen kan blandt andet dække, hvis:</p>
        <ul>
          <li>varen ikke modtages</li>
          <li>varen er væsentligt anderledes end beskrevet</li>
          <li>varen er væsentligt beskadiget ved modtagelsen</li>
          <li>der mangler væsentlige dele</li>
          <li>varen viser sig at være uægte, selv om den er annonceret som ægte</li>
        </ul>
        <p>Køberbeskyttelsen dækker som udgangspunkt ikke:</p>
        <ul>
          <li>almindeligt slid, som fremgår af annoncen</li>
          <li>fejl eller mangler, der tydeligt er beskrevet eller vist</li>
          <li>købers almindelige fortrydelse af en handel mellem private</li>
          <li>skader eller forringelser, som er opstået efter modtagelsen</li>
          <li>
            at varen ikke passer køber, eksempelvis hvis et par bukser er for
            små, når størrelse, mål, stand og øvrige oplysninger svarer til
            annoncen
          </li>
          <li>
            uenighed om personlige forventninger, når varen svarer til annoncen
          </li>
        </ul>
        <p>
          Ved handel mellem private er der som udgangspunkt ingen almindelig
          bytte- eller fortrydelsesret. Køber kan derfor ikke kræve at bytte eller
          returnere en vare alene, fordi den ikke passer, eller fordi køber
          ombestemmer sig, når varen er som beskrevet. Køber og sælger kan dog
          frivilligt aftale en anden løsning.
        </p>
        <p>
          Køber skal ved forsendelse anmelde et problem senest 2 kalenderdage
          efter, at forsendelsen er registreret som leveret.
        </p>
      </>
    ),
  },
  {
    id: "fragt",
    title: "9. Fragt og personlig afhentning",
    content: (
      <>
        <p>Køber og sælger kan vælge mellem:</p>
        <ul>
          <li>levering via Equishoppers godkendte fragtpartnere</li>
          <li>personlig afhentning efter indbyrdes aftale</li>
        </ul>
        <p>
          Ved levering via en fragtpartner stilles trackingoplysninger til
          rådighed, når de er tilgængelige.
        </p>
        <p>
          Ved levering via DAO gælder DAO&apos;s til enhver tid gældende vilkår,
          leveringsbetingelser, operationelle praksis samt erstatningsregler
          for transporten. Eventuelle ændringer hos DAO finder automatisk
          anvendelse for forsendelser, der gennemføres via DAO.
        </p>
        <p>
          Eventuelle krav vedrørende transportskader, bortkomst eller
          forsinkelse behandles i overensstemmelse med DAO&apos;s til enhver tid
          gældende vilkår og erstatningsregler. Equishopper bistår parterne
          med sagsbehandlingen, men påtager sig ikke et videregående
          transportansvar end det, der følger af DAO&apos;s gældende regler eller
          ufravigelig lovgivning.
        </p>
        <p>
          Sælger er ansvarlig for at emballere varen forsvarligt og overholde
          fragtpartnerens regler om mål, vægt, emballage og forbudte varer.
        </p>
        <p>
          Ved personlig afhentning aftaler køber og sælger selv tid og sted.
          Køber skal have mulighed for at besigtige varen ved overdragelsen.
        </p>
      </>
    ),
  },
  {
    id: "modtagelse",
    title: "10. Modtagelse og frigivelse af betaling",
    content: (
      <>
        <h3>Ved forsendelse</h3>
        <p>
          Når pakken er registreret som leveret, har køber 2 kalenderdage til
          enten at godkende handlen eller oprette en tvist.
        </p>
        <p>
          Hvis køber ikke reagerer inden fristens udløb, anses handlen for
          gennemført, og betalingen frigives til sælger.
        </p>
        <h3>Ved personlig afhentning</h3>
        <p>
          Ved personlig afhentning besigtiger køber varen ved overdragelsen.
        </p>
        <p>
          Når køber aktivt bekræfter i Equishopper, at varen er modtaget,
          anses handlen for gennemført, og betalingen frigives straks til
          sælger.
        </p>
        <p>
          Hvis handlen ikke gennemføres ved afhentning, kan ordren annulleres,
          hvorefter køber får det fulde beløb tilbage.
        </p>
      </>
    ),
  },
  {
    id: "tvister",
    title: "11. Tvister",
    content: (
      <>
        <p>
          Hvis der opstår uenighed mellem køber og sælger, kan begge parter
          oprette en tvist via Equishopper.
        </p>
        <p>En tvist kan blandt andet vedrøre:</p>
        <ul>
          <li>varen er ikke modtaget</li>
          <li>varen er beskadiget</li>
          <li>varen svarer ikke væsentligt til annoncen</li>
          <li>forkert vare er modtaget</li>
          <li>væsentlige dele mangler</li>
          <li>anden væsentlig uenighed om handlen</li>
        </ul>
        <p>Equishopper kan bede begge parter om dokumentation, herunder:</p>
        <ul>
          <li>billeder eller video</li>
          <li>trackingoplysninger</li>
          <li>billeder af emballage</li>
          <li>beskeder mellem parterne</li>
          <li>kvitteringer eller anden relevant dokumentation</li>
        </ul>
        <p>
          Når en tvist oprettes rettidigt, tilbageholdes betalingen hos
          betalingsudbyderen, indtil tvisten er afsluttet.
        </p>
        <p>
          Equishopper beslutter som led i tvistbehandlingen, om betalingen
          skal udbetales til sælger, tilbagebetales helt eller delvist til køber,
          eller fortsat tilbageholdes, mens der indhentes yderligere
          dokumentation.
        </p>
        <p>
          Equishopper kan som led i tvistbehandlingen beslutte, at en vare
          skal returneres til sælger, før en hel eller delvis refundering
          gennemføres. Returneringen skal ske efter Equishoppers anvisninger
          og inden for den fastsatte frist.
        </p>
        <p>
          Equishoppers tvistbehandling følger de principper og den proces,
          der er beskrevet på siden &quot;Sådan behandler vi tvister&quot;. Siden
          beskriver den normale sagsbehandling og kan løbende opdateres for
          at afspejle forbedringer af processen. Equishopper foretager altid
          en konkret vurdering af den enkelte sag på baggrund af den
          foreliggende dokumentation.
        </p>
        <p>
          Køber og sælger kan fortsat gøre deres rettigheder gældende uden for
          Equishopper, eksempelvis ved domstolene, hvis de er uenige i
          resultatet.
        </p>
      </>
    ),
  },
  {
    id: "misbrug",
    title: "12. Misbrug af platformen",
    content: (
      <>
        <p>Det er ikke tilladt at:</p>
        <ul>
          <li>omgå betaling via Equishopper</li>
          <li>opfordre andre til at betale uden for platformen</li>
          <li>oprette falske, vildledende eller gentagne annoncer</li>
          <li>bruge billeder, der ikke viser den konkrete vare</li>
          <li>indsende falsk eller vildledende dokumentation i en tvist</li>
          <li>misbruge anmeldelser eller rapporteringsfunktioner</li>
          <li>oprette flere konti uden Equishoppers tilladelse</li>
          <li>bruge platformen til svindel eller anden ulovlig aktivitet</li>
        </ul>
        <p>
          Ved overtrædelse kan Equishopper fjerne indhold, annullere handler,
          begrænse funktioner, suspendere eller lukke kontoen og i relevante
          tilfælde kontakte myndighederne.
        </p>
      </>
    ),
  },
  {
    id: "forbudte-varer",
    title: "13. Forbudte varer",
    content: (
      <>
        <p>Det er ikke tilladt at sælge varer, som:</p>
        <ul>
          <li>er ulovlige eller stjålne</li>
          <li>krænker andres immaterielle rettigheder</li>
          <li>er forfalskede</li>
          <li>udgør en væsentlig sikkerhedsrisiko</li>
          <li>
            strider mod dansk lovgivning, fragtpartnernes regler eller
            Equishoppers regler for tilladte og forbudte varer.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "anmeldelser",
    title: "14. Beskeder og anmeldelser",
    content: (
      <>
        <p>
          Beskedfunktionen må bruges til saglig kommunikation om annoncer,
          handler, afhentning, fragt og tvister.
        </p>
        <p>
          Anmeldelser skal være ærlige, relevante og baseret på en faktisk
          gennemført handel.
        </p>
      </>
    ),
  },
  {
    id: "ansvar",
    title: "15. Ansvar",
    content: (
      <>
        <p>
          Sælger er ansvarlig for, at varen, annoncen og billederne er korrekte,
          og at varen emballeres og afsendes forsvarligt.
        </p>
        <p>
          Køber er ansvarlig for at kontrollere varen ved modtagelse eller
          afhentning, anmelde problemer inden for fristerne og behandle varen
          forsvarligt.
        </p>
        <p>
          Equishopper formidler kontakten og handlen mellem køber og sælger, men
          er ikke part i købsaftalen. Equishopper har derfor ikke ansvar for
          selve varen, herunder dens kvalitet, stand, sikkerhed, lovlighed eller
          om den svarer til købers forventninger. Equishopper er ansvarlig for
          den del af tjenesten, som Equishopper selv leverer, eksempelvis
          platformens funktioner og behandlingen af en tvist, i det omfang det
          følger af gældende lov.
        </p>
      </>
    ),
  },
  {
    id: "konto",
    title: "16. Suspension, lukning og sletning af konto",
    content: (
      <>
        <p>
          Du kan til enhver tid slette din konto, såfremt der ikke er aktive
          handler, åbne tvister eller afventende betalinger eller udbetalinger.
        </p>
        <p>
          Ved sletning anonymiseres eller slettes personoplysninger, medmindre
          Equishopper er forpligtet til at bevare bestemte oplysninger af hensyn
          til bogføring, dokumentation, sikkerhed, tvister eller andre retlige
          forpligtelser.
        </p>
      </>
    ),
  },
  {
    id: "aendringer",
    title: "17. Ændringer af handelsbetingelserne",
    content: (
      <>
        <p>
          Equishopper kan ændre disse handelsbetingelser. Væsentlige ændringer
          meddeles brugerne inden ikrafttrædelsen.
        </p>
        <p>
          Den seneste version vil altid være tilgængelig på Equishoppers
          hjemmeside.
        </p>
      </>
    ),
  },
  {
    id: "lovvalg",
    title: "18. Klager, lovvalg og tvister med Equishopper",
    content: (
      <>
        <p>Spørgsmål eller klager kan sendes til support@equishopper.dk.</p>
        <p>
          Disse handelsbetingelser er underlagt dansk ret. Uenigheder, som ikke
          kan løses direkte, behandles af de kompetente klageorganer eller
          domstole efter gældende regler.
        </p>
      </>
    ),
  },
];

export default function HandelsbetingelserPage() {
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
              Handelsbetingelser
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/70 sm:text-xl">
              Her kan du læse de regler, der gælder, når du køber, sælger og
              bruger Equishopper.
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
                  {sections.map((section) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className="block rounded-xl px-3 py-2 text-sm text-stone-600 transition hover:bg-[#f4f1e9] hover:text-[#063f32]"
                    >
                     {section.title}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>

            <article className="rounded-[30px] border border-[#e7e1d7] bg-white p-6 shadow-[0_18px_60px_rgba(35,45,40,0.07)] sm:p-8 lg:p-10">
              <div className="mb-10 rounded-2xl border border-[#eadfcb] bg-[#fbfaf7] p-5 text-sm leading-6 text-stone-600">
                Arbejdsudkast: Prisside, DAO&apos;s endelige
                integrations- og erstatningsvilkår samt det endelige betalings-
                og fragtflow skal kontrolleres før offentlig lancering. Få også
                den endelige tekst juridisk gennemgået.
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

                    <div className="mt-5 space-y-4 text-base leading-7 text-stone-700 [&_h3]:mt-7 [&_h3]:font-serif [&_h3]:text-2xl [&_h3]:font-bold [&_h3]:text-[#063f32] [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-2">
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