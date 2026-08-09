import Link from "next/link";

import Header from "@/components/home/Header";

const processSteps = [
  {
    number: "01",
    title: "En tvist oprettes",
    text: "Køber eller sælger beskriver problemet og indsender den dokumentation, der er relevant for sagen.",
  },
  {
    number: "02",
    title: "Begge parter bliver hørt",
    text: "Den anden part får mulighed for at svare og sende sin egen forklaring, billeder eller anden dokumentation.",
  },
  {
    number: "03",
    title: "Equishopper vurderer sagen",
    text: "Vi gennemgår annoncen, dokumentationen, ordreoplysninger, beskeder og eventuelle fragt- og trackingoplysninger.",
  },
  {
    number: "04",
    title: "Der træffes en afgørelse",
    text: "Afgørelsen kan blandt andet være udbetaling til sælger, hel eller delvis refundering til køber eller refundering mod returnering.",
  },
];

const evidenceItems = [
  "Annoncens tekst, billeder og oplysninger om stand, størrelse og mærke",
  "Billeder eller video af varen ved modtagelsen",
  "Billeder af emballage ved mulig transportskade",
  "Tracking- og leveringsoplysninger",
  "Beskeder mellem køber og sælger på Equishopper",
  "Kvitteringer, serienumre eller anden relevant dokumentation",
  "Hvornår problemet blev anmeldt i forhold til levering eller afhentning",
];

const decisionCards = [
  {
    title: "Ingen refundering",
    text: "Hvis varen svarer til annoncen, eller det påklagede forhold allerede var tydeligt beskrevet eller vist.",
  },
  {
    title: "Delvis refundering",
    text: "Hvis der er et reelt problem, men varen fortsat har væsentlig værdi for køber, og en prisreduktion vurderes som en rimelig løsning.",
  },
  {
    title: "Fuld refundering",
    text: "Hvis varen eksempelvis er væsentligt anderledes end beskrevet, og forholdet berettiger til at handlen går tilbage.",
  },
  {
    title: "Refundering mod retur",
    text: "Equishopper kan kræve, at varen returneres efter vores anvisninger og inden en fastsat frist, før refunderingen gennemføres.",
  },
];

const examples = [
  {
    label: "Eksempel 1",
    title: "Ridehjelm med en ikke-oplyst revne",
    situation:
      "Køber modtager en ridehjelm og dokumenterer umiddelbart efter levering en revne, som ikke fremgår af annoncen eller sælgers billeder.",
    assessment:
      "Hvis dokumentationen sandsynliggør, at revnen var til stede ved modtagelsen, kan varen være væsentligt anderledes end beskrevet.",
    possibleOutcome:
      "Fuld refundering kan være relevant, normalt mod returnering af varen.",
  },
  {
    label: "Eksempel 2",
    title: "Sadel med tydeligt beskrevne brugsspor",
    situation:
      "En sadel er annonceret med tydelige billeder og beskrivelse af ridser og almindelige brugsspor. Efter modtagelsen ønsker køber et prisnedslag på grund af de samme brugsspor.",
    assessment:
      "Når forholdet var tydeligt oplyst inden købet, vil det normalt ikke i sig selv berettige køber til refundering.",
    possibleOutcome:
      "Ingen refundering, medmindre der dokumenteres andre væsentlige forhold.",
  },
  {
    label: "Eksempel 3",
    title: "Varen passer ikke, men korrekt annonce",
    situation:
      "Køber modtager varen i den størrelse, der stod i annoncen, men konstaterer, at varen ikke passer.",
    assessment:
      "Ved handel mellem private er manglende pasform eller almindelig fortrydelse som udgangspunkt ikke omfattet af køberbeskyttelsen, når annoncen var korrekt.",
    possibleOutcome:
      "Ingen refundering alene på grund af pasform eller ombestemmelse.",
  },
  {
    label: "Eksempel 4",
    title: "Sadel beskrevet som næsten uden brugsspor",
    situation:
      "Annoncen beskriver sadlen som næsten uden brugsspor, men købers billeder viser omfattende slid, dybe ridser og tydelig misfarvning.",
    assessment:
      "Hvis forskellen mellem annoncen og den modtagne vare er reel og væsentlig, kan køber have krav på en løsning.",
    possibleOutcome:
      "Afhængigt af omfanget kan delvis refundering eller fuld refundering mod retur være relevant.",
  },
  {
    label: "Eksempel 5",
    title: "Mindre fejl, som ikke ødelægger varens funktion",
    situation:
      "Køber dokumenterer en mindre skade eller mangel, som ikke var oplyst, men varen kan fortsat anvendes som forventet.",
    assessment:
      "Hvis problemet er reelt, men ikke gør varen værdiløs eller væsentligt uanvendelig, kan et rimeligt prisnedslag være mere proportionalt end at lade hele handlen gå tilbage.",
    possibleOutcome:
      "Delvis refundering kan være relevant.",
  },
  {
    label: "Eksempel 6",
    title: "Mulig transportskade",
    situation:
      "Varen ankommer beskadiget, og emballagen viser tydelige tegn på påvirkning under transporten.",
    assessment:
      "Vi ser blandt andet på emballeringen, billeder fra modtagelsen, tracking og fragtpartnerens regler. Ved DAO behandles transportrelaterede krav efter DAO's til enhver tid gældende vilkår og erstatningsregler.",
    possibleOutcome:
      "Resultatet afhænger af dokumentationen og fragtpartnerens gældende regler om ansvar og erstatning.",
  },
  {
    label: "Eksempel 7",
    title: "Varen er ikke modtaget",
    situation:
      "Tracking viser ikke en normal levering, og køber oplyser, at pakken ikke er modtaget.",
    assessment:
      "Equishopper undersøger tracking og andre tilgængelige leveringsoplysninger og kan afvente fragtpartnerens undersøgelse.",
    possibleOutcome:
      "Betalingen kan fortsat tilbageholdes, mens sagen undersøges. Den endelige løsning afhænger af dokumentationen og eventuelle erstatningsregler hos fragtpartneren.",
  },
  {
    label: "Eksempel 8",
    title: "Uenighed om personlig forventning",
    situation:
      "Køber synes efter modtagelsen, at farven, følelsen eller det generelle udtryk ikke helt svarer til den personlige forventning, men varen matcher annoncen.",
    assessment:
      "Køberbeskyttelsen er ikke en almindelig tilfredshedsgaranti. Det afgørende er som udgangspunkt, om varen objektivt svarer til annoncen.",
    possibleOutcome:
      "Ingen refundering alene på baggrund af en personlig forventning.",
  },
];

const disputeCases = [
  {
    no: 1,
    situation: "Varen svarer til annoncen",
    review:
      "Annonce, billeder og øvrig dokumentation stemmer overens med den modtagne vare.",
    result:
      "Ingen refundering. Betalingen frigives til sælger.",
    returnRequired: "Nej",
  },
  {
    no: 2,
    situation: "Mindre fejl, som ikke var beskrevet",
    review:
      "Fejlens omfang, betydning for brugen og om forholdet er væsentligt i forhold til varens pris og beskrevne stand.",
    result:
      "Delvis refundering kan være relevant, hvis køber beholder varen.",
    returnRequired: "Nej",
  },
  {
    no: 3,
    situation: "Væsentlig skjult fejl",
    review:
      "Om fejlen sandsynligvis var til stede ved salget og ikke er opstået efter modtagelsen.",
    result:
      "Fuld refundering kan være relevant.",
    returnRequired: "Ja",
  },
  {
    no: 4,
    situation: "Forkert vare modtaget",
    review:
      "Ordren, annoncen, billederne og den faktisk modtagne vare.",
    result:
      "Fuld refundering kan være relevant, når den forkerte vare returneres.",
    returnRequired: "Ja",
  },
  {
    no: 5,
    situation: "Forkert størrelse i forhold til annoncen",
    review:
      "Størrelsesmærkning, annoncens oplysninger og billeder af varen.",
    result:
      "Fuld refundering kan være relevant, hvis annoncen objektivt var forkert.",
    returnRequired: "Ja",
  },
  {
    no: 6,
    situation: "Køber valgte korrekt vare, men den passer ikke",
    review:
      "Om varen og størrelsen svarer til annoncen, og om problemet alene handler om pasform eller personlig forventning.",
    result:
      "Normalt ingen refundering.",
    returnRequired: "Nej",
  },
  {
    no: 7,
    situation: "Varen er mere slidt end beskrevet",
    review:
      "Forskellen mellem annoncen og den modtagne vares faktiske stand samt afvigelsens betydning.",
    result:
      "Delvis eller fuld refundering kan være relevant afhængigt af omfanget.",
    returnRequired: "Afhænger",
  },
  {
    no: 8,
    situation:
      "Køber mener, at varen havde en fejl, som ikke var beskrevet. Sælger mener, at køber selv har forårsaget skaden.",
    review:
      "Annoncens billeder, billeder ved modtagelsen, tidspunktet for reklamationen, emballage, transportforløb og øvrig dokumentation fra begge parter.",
    result:
      "Hvis det sandsynliggøres, at fejlen var til stede ved salget, kan delvis eller fuld refundering være relevant. Hvis dokumentationen peger på, at skaden er opstået efter levering, kan betalingen frigives til sælger.",
    returnRequired: "Afhænger",
  },
  {
    no: 9,
    situation: "Manglende tilbehør",
    review:
      "Om tilbehøret indgik i annoncen, var nævnt i beskrivelsen eller fremgik af billederne.",
    result:
      "Delvis refundering eller fuld refundering kan være relevant, afhængigt af hvor væsentligt det manglende tilbehør er.",
    returnRequired: "Afhænger",
  },
  {
    no: 10,
    situation: "Transportskade",
    review:
      "Billeder af varen og emballagen, tracking, leveringsforløb og fragtpartnerens oplysninger og gældende regler.",
    result:
      "Afhænger af dokumentationen og fragtpartnerens gældende vilkår og erstatningsregler.",
    returnRequired: "Afhænger",
  },
  {
    no: 11,
    situation: "Pakken er bortkommet",
    review:
      "Tracking, scanninger og fragtpartnerens undersøgelse af forsendelsen.",
    result:
      "Betalingen kan tilbageholdes, indtil sagen er afklaret.",
    returnRequired: "Nej",
  },
  {
    no: 12,
    situation: "Sælger sender aldrig varen",
    review:
      "Tracking og øvrig dokumentation for, om varen blev afsendt inden for den gældende frist.",
    result:
      "Fuld refundering.",
    returnRequired: "Nej",
  },
  {
    no: 13,
    situation: "Reklamation indgives sent",
    review:
      "Tidspunktet for reklamationen, hvornår varen blev modtaget, og om den sene anmeldelse påvirker muligheden for at vurdere sagen.",
    result:
      "Kan tale imod refundering og vurderes konkret.",
    returnRequired: "Nej",
  },
  {
    no: 14,
    situation: "Utilstrækkelig dokumentation",
    review:
      "Den dokumentation, Equishopper har modtaget, og om parterne har uploadet det materiale, de er blevet anmodet om.",
    result:
      "Afgørelsen træffes på det foreliggende grundlag.",
    returnRequired: "Afhænger",
  },
  {
    no: 15,
    situation: "Begge parter har delvist ret",
    review:
      "Den samlede dokumentation og sagens konkrete omstændigheder.",
    result:
      "Delvis refundering kan være den mest rimelige løsning.",
    returnRequired: "Nej",
  },
] as const;

export default function DisputeHelpPage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#f8f5ee]">
        <section className="bg-[#063f32] px-4 pb-20 pt-36 sm:px-6 sm:pb-24 sm:pt-40 lg:px-8">
          <div className="mx-auto w-full max-w-5xl">
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#d4af37]">
              Køberbeskyttelse
            </p>

            <h1 className="mt-5 max-w-4xl font-serif text-5xl leading-[1.02] text-white sm:text-6xl lg:text-7xl">
              Sådan behandler vi tvister
            </h1>

            <p className="mt-7 max-w-3xl text-lg leading-8 text-white/75 sm:text-xl">
              Når køber og sælger er uenige om en handel, vurderer
              Equishopper sagen konkret og på baggrund af den dokumentation,
              der er tilgængelig fra begge parter.
            </p>

            <div className="mt-8 max-w-3xl rounded-[24px] border border-white/15 bg-white/10 p-5 text-sm leading-6 text-white/75">
              Eksemplerne på denne side er vejledende. To sager kan ligne
              hinanden uden at være ens, og en afgørelse afhænger altid af
              den konkrete handel og den dokumentation, der foreligger.
            </div>
          </div>
        </section>

        <section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div className="mx-auto w-full max-w-5xl space-y-16">
            <section>
              <SectionIntro
                eyebrow="Processen"
                title="Fra uenighed til afgørelse"
                text="Formålet er at give begge parter mulighed for at blive hørt og træffe en saglig afgørelse på et så oplyst grundlag som muligt."
              />

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                {processSteps.map((step) => (
                  <article
                    key={step.number}
                    className="rounded-[28px] border border-[#e7e1d7] bg-white p-6 shadow-[0_14px_45px_rgba(35,45,40,0.05)]"
                  >
                    <span className="text-sm font-semibold tracking-[0.2em] text-[#d4af37]">
                      {step.number}
                    </span>
                    <h3 className="mt-3 font-serif text-2xl font-bold text-[#063f32]">
                      {step.title}
                    </h3>
                    <p className="mt-3 leading-7 text-stone-600">
                      {step.text}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
              <div>
                <SectionIntro
                  eyebrow="Dokumentation"
                  title="Hvad lægger vi vægt på?"
                  text="Vi vurderer ikke kun én besked eller ét billede. Vi ser på sagen samlet."
                />
              </div>

              <div className="rounded-[30px] border border-[#e7e1d7] bg-white p-6 shadow-[0_14px_45px_rgba(35,45,40,0.05)] sm:p-8">
                <ul className="space-y-4">
                  {evidenceItems.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 leading-7 text-stone-700"
                    >
                      <span className="mt-2 h-2 w-2 flex-none rounded-full bg-[#d4af37]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-7 rounded-2xl bg-[#f8f5ee] p-5 text-sm leading-6 text-stone-600">
                  Det er en god idé at dokumentere et problem hurtigt efter
                  modtagelsen og undgå unødig brug eller ændring af varen,
                  mens en tvist behandles.
                </div>
              </div>
            </section>

            <section>
              <SectionIntro
                eyebrow="Afgørelser"
                title="Hvilke løsninger kan en sag ende med?"
                text="Den valgte løsning skal så vidt muligt stå i rimeligt forhold til det problem, der er dokumenteret."
              />

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {decisionCards.map((card) => (
                  <article
                    key={card.title}
                    className="rounded-[26px] border border-[#eadfcb] bg-[#fbfaf7] p-6"
                  >
                    <h3 className="font-serif text-2xl font-bold text-[#063f32]">
                      {card.title}
                    </h3>
                    <p className="mt-3 leading-7 text-stone-600">
                      {card.text}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] bg-[#063f32] p-7 text-white sm:p-9">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#d4af37]">
                Retur
              </p>
              <h2 className="mt-3 font-serif text-3xl font-bold sm:text-4xl">
                Når en vare skal sendes tilbage
              </h2>

              <div className="mt-5 grid gap-6 leading-7 text-white/75 md:grid-cols-2">
                <p>
                  Equishopper kan beslutte, at varen skal returneres, før en
                  hel eller delvis refundering gennemføres. Køber skal følge
                  de returanvisninger og den frist, der fremgår af sagen.
                </p>
                <p>
                  Varen skal som udgangspunkt returneres i den stand, den blev
                  modtaget i. Hvis retur sker via en fragtpartner, kan
                  fragtpartnerens regler om blandt andet transport,
                  emballering og erstatning også være relevante.
                </p>
              </div>
            </section>

            <section>
              <SectionIntro
                eyebrow="Eksempler"
                title="Sådan kan konkrete sager blive vurderet"
                text="Eksemplerne viser vores normale tilgang. De er ikke garantier for udfaldet af en fremtidig sag."
              />

              <div className="mt-8 space-y-5">
                {examples.map((example) => (
                  <ExampleCard key={example.title} {...example} />
                ))}
              </div>
            </section>

            <section>
              <SectionIntro
                eyebrow="Typiske tvister"
                title="Eksempler på, hvordan Equishopper normalt vurderer forskellige sager"
                text="Tabellen viser vores normale tilgang til typiske tvister. Hver sag vurderes altid individuelt på baggrund af den konkrete handel og den dokumentation, der foreligger."
              />

              {/* Desktop: kompakt tabel uden horisontal scroll */}
              <div className="mt-8 hidden overflow-hidden rounded-[28px] border border-[#e7e1d7] bg-white shadow-[0_14px_45px_rgba(35,45,40,0.05)] lg:block">
                <table className="w-full table-fixed text-[12.5px]">
                  <colgroup>
                    <col className="w-[5%]" />
                    <col className="w-[19%]" />
                    <col className="w-[28%]" />
                    <col className="w-[38%]" />
                    <col className="w-[10%]" />
                  </colgroup>

                  <thead className="bg-[#063f32] text-white">
                    <tr>
                      <th className="px-3 py-4 text-left font-semibold">
                        Nr.
                      </th>
                      <th className="px-3 py-4 text-left font-semibold">
                        Situation
                      </th>
                      <th className="px-3 py-4 text-left font-semibold">
                        Hvad undersøger vi?
                      </th>
                      <th className="px-3 py-4 text-left font-semibold">
                        Typisk udfald
                      </th>
                      <th className="px-3 py-4 text-center font-semibold">
                        Retur?
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#ece6da]">
                    {disputeCases.map((row) => (
                      <tr
                        key={row.no}
                        className="align-top transition hover:bg-[#fbfaf7]"
                      >
                        <td className="px-3 py-4 font-semibold text-[#063f32]">
                          {row.no}
                        </td>

                        <td className="px-3 py-4 font-medium leading-5 text-stone-900">
                          {row.situation}
                        </td>

                        <td className="px-3 py-4 leading-5 text-stone-600">
                          {row.review}
                        </td>

                        <td className="px-3 py-4 leading-5 text-stone-600">
                          {row.result}
                        </td>

                        <td className="px-3 py-4 text-center">
                          <ReturnBadge value={row.returnRequired} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobil/tablet: cases som kort i stedet for bred tabel */}
              <div className="mt-8 grid gap-4 lg:hidden">
                {disputeCases.map((row) => (
                  <article
                    key={row.no}
                    className="rounded-[24px] border border-[#e7e1d7] bg-white p-5 shadow-[0_10px_30px_rgba(35,45,40,0.04)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b79a3d]">
                          Case {row.no}
                        </p>
                        <h3 className="mt-2 font-serif text-xl font-bold leading-snug text-[#063f32]">
                          {row.situation}
                        </h3>
                      </div>

                      <ReturnBadge value={row.returnRequired} />
                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl bg-[#fbfaf7] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0b5a47]">
                          Hvad undersøger vi?
                        </p>
                        <p className="mt-2 text-sm leading-6 text-stone-600">
                          {row.review}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-[#fbfaf7] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0b5a47]">
                          Typisk udfald
                        </p>
                        <p className="mt-2 text-sm leading-6 text-stone-600">
                          {row.result}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="mt-6 rounded-[24px] border border-[#d4af37]/30 bg-[#fffdf7] p-6">
                <h3 className="font-serif text-2xl font-bold text-[#063f32]">
                  Dokumentation
                </h3>

                <p className="mt-4 leading-7 text-stone-600">
                  For at Equishopper kan behandle en tvist så hurtigt og
                  korrekt som muligt, er det vigtigt, at både køber og sælger
                  uploader den dokumentation, som Equishopper anmoder om i
                  forbindelse med forsendelse, modtagelse og den efterfølgende
                  sagsbehandling.
                </p>

                <p className="mt-4 leading-7 text-stone-600">
                  Manglende eller utilstrækkelig dokumentation kan have
                  betydning for, hvilke oplysninger Equishopper kan lægge til
                  grund ved afgørelsen af sagen.
                </p>
              </div>

              <div className="mt-5 rounded-[24px] border border-[#e7e1d7] bg-white p-6 text-sm leading-6 text-stone-600">
                <span className="font-semibold text-[#063f32]">
                  Bemærk:
                </span>{" "}
                Eksemplerne viser Equishoppers normale tilgang til typiske
                tvister. Hver sag vurderes individuelt på baggrund af de
                konkrete omstændigheder og den dokumentation, der foreligger.
                En afgørelse i én sag er derfor ikke nødvendigvis udtryk for,
                hvordan en anden sag med lignende forhold vil blive afgjort.
              </div>
            </section>

            <section className="grid gap-5 md:grid-cols-2">
              <article className="rounded-[28px] border border-[#e7e1d7] bg-white p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d4af37]">
                  Frister
                </p>
                <h2 className="mt-3 font-serif text-3xl font-bold text-[#063f32]">
                  Reagér hurtigt
                </h2>
                <p className="mt-4 leading-7 text-stone-600">
                  Ved forsendelse skal et problem anmeldes inden for den frist,
                  der fremgår af Equishoppers handelsbetingelser. Hvis en tvist
                  oprettes rettidigt, tilbageholdes betalingen, mens sagen
                  behandles.
                </p>
              </article>

              <article className="rounded-[28px] border border-[#e7e1d7] bg-white p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d4af37]">
                  Uafhængige rettigheder
                </p>
                <h2 className="mt-3 font-serif text-3xl font-bold text-[#063f32]">
                  Equishopper erstatter ikke domstolene
                </h2>
                <p className="mt-4 leading-7 text-stone-600">
                  Equishoppers afgørelse styrer betalingsflowet på platformen.
                  Køber og sælger kan fortsat gøre eventuelle rettigheder
                  gældende uden for Equishopper efter de almindelige regler.
                </p>
              </article>
            </section>

            <section className="rounded-[32px] border border-[#d4af37]/40 bg-[#fffdf7] p-7 sm:p-9">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#b79a3d]">
                    Vil du læse det juridiske grundlag?
                  </p>
                  <h2 className="mt-2 font-serif text-3xl font-bold text-[#063f32]">
                    Se vores handelsbetingelser
                  </h2>
                  <p className="mt-3 max-w-2xl leading-7 text-stone-600">
                    Denne side beskriver den normale tvistproces. De gældende
                    handelsbetingelser er en del af aftalegrundlaget for brugen
                    af Equishopper.
                  </p>
                </div>

                <Link
                  href="/handelsbetingelser#tvister"
                  className="inline-flex flex-none items-center justify-center whitespace-nowrap rounded-full bg-[#063f32] px-6 py-3.5 font-semibold text-white transition hover:bg-[#052f26]"
                >
                  Se handelsbetingelser
                </Link>
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

function ReturnBadge({
  value,
}: {
  value: "Ja" | "Nej" | "Afhænger";
}) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        value === "Ja"
          ? "bg-emerald-50 text-emerald-800"
          : value === "Nej"
            ? "bg-stone-100 text-stone-600"
            : "bg-amber-50 text-amber-800"
      }`}
    >
      {value}
    </span>
  );
}

function ExampleCard({
  label,
  title,
  situation,
  assessment,
  possibleOutcome,
}: {
  label: string;
  title: string;
  situation: string;
  assessment: string;
  possibleOutcome: string;
}) {
  return (
    <article className="overflow-hidden rounded-[28px] border border-[#e7e1d7] bg-white shadow-[0_14px_45px_rgba(35,45,40,0.05)]">
      <div className="border-b border-[#eee8dc] bg-[#fbfaf7] px-6 py-5 sm:px-7">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b79a3d]">
          {label}
        </p>
        <h3 className="mt-2 font-serif text-2xl font-bold text-[#063f32] sm:text-3xl">
          {title}
        </h3>
      </div>

      <div className="grid gap-0 md:grid-cols-3">
        <ExampleColumn label="Situation" text={situation} />
        <ExampleColumn label="Vurdering" text={assessment} />
        <ExampleColumn
          label="Muligt udfald"
          text={possibleOutcome}
          last
        />
      </div>
    </article>
  );
}

function ExampleColumn({
  label,
  text,
  last = false,
}: {
  label: string;
  text: string;
  last?: boolean;
}) {
  return (
    <div
      className={`p-6 sm:p-7 ${
        last
          ? ""
          : "border-b border-[#eee8dc] md:border-b-0 md:border-r"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0b5a47]">
        {label}
      </p>
      <p className="mt-3 text-sm leading-6 text-stone-600">{text}</p>
    </div>
  );
}