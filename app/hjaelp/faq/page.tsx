import Link from "next/link";
import Header from "@/components/home/Header";

const categories = [
  {
    title: "Konto",
    items: [
      {
        q: "Hvordan opretter jeg en bruger?",
        a: <>Klik på <strong>Opret bruger</strong> og følg vejledningen. Det er gratis at oprette en konto.</>,
      },
      {
        q: "Koster det noget at have en konto?",
        a: <>Nej. Det er gratis at oprette og have en konto på Equishopper.</>,
      },
    ],
  },
  {
    title: "Køb",
    items: [
      {
        q: "Hvordan køber jeg en vare?",
        a: <>Når du har fundet en vare, gennemfører du betalingen direkte på Equishopper. Betalingen tilbageholdes, indtil du har modtaget og godkendt din vare.</>,
      },
      {
        q: "Hvornår trækkes pengene?",
        a: <>Pengene reserveres og trækkes, når købet gennemføres.</>,
      },
      {
        q: "Hvornår får sælger sine penge?",
        a: <>
          <p>Når køber har modtaget og godkendt varen, udbetales beløbet automatisk til sælger.</p>
          <p className="mt-3">Køber har <strong>48 timer</strong> fra registreret levering til enten at godkende modtagelsen eller oprette en tvist. Hvis køber hverken godkender modtagelsen eller opretter en tvist inden for denne periode, udbetales pengene automatisk til sælger.</p>
        </>,
      },
    ],
  },
  {
    title: "Fragt",
    items: [
      { q: "Hvordan fungerer fragt?", a: <>Fragt bestilles sammen med købet. Fragtprisen afhænger af den pakkeklasse, sælger har valgt.</>},
      { q: "Hvilke pakker kan sendes?", a: <>Equishopper tilbyder fragt på pakker op til 15 kg.</>},
      { q: "Hvad hvis pakken bliver væk?", a: <>Sagen behandles efter fragtpartnerens gældende regler og erstatningsvilkår.</>},
    ],
  },
  {
    title: "Tvister",
    items: [
      { q: "Hvornår kan jeg oprette en tvist?", a: <>Hvis varen væsentligt afviger fra annoncen, eller der opstår et andet væsentligt problem. Læs mere på <Link href="/hjaelp/tvister" className="underline">Sådan behandler vi tvister</Link>.</>},
      { q: "Hvor lang tid tager en tvist?", a: <>Det afhænger af sagen og den nødvendige dokumentation.</>},
      { q: "Hvilken dokumentation skal jeg uploade?", a: <>Kun den dokumentation, Equishopper beder om, f.eks. billeder af varen, emballagen eller anden relevant dokumentation.</>},
    ],
  },
  {
    title: "Betaling",
    items: [
      { q: "Hvordan betaler jeg?", a: <>Alle betalinger gennemføres sikkert via Stripe.</>},
      { q: "Er mine betalingsoplysninger sikre?", a: <>Ja. Equishopper håndterer ikke dine kortoplysninger. Betalingen behandles via Stripe.</>},
      { q: "Hvornår får jeg en refundering?", a: <>Hvis du får medhold i en tvist, gennemføres refunderingen hurtigst muligt efter afgørelsen.</>},
    ],
  },
  {
    title: "Gebyrer",
    items: [
      { q: "Hvad koster det at sælge?", a: <>Sælger betaler 2 % af salgsprisen.</>},
      { q: "Hvad koster det at købe?", a: <>Køber betaler 3 % af vareprisen + 5 kr. i køberbeskyttelse. Hertil kommer eventuel fragt.</>},
    ],
  },
];

export default function FAQPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#f8f5ee]">
        <section className="bg-[#063f32] px-4 pb-20 pt-36">
          <div className="mx-auto max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#d4af37]">Hjælp & Tryghed</p>
            <h1 className="mt-5 font-serif text-6xl text-white">Ofte stillede spørgsmål</h1>
            <p className="mt-6 max-w-2xl text-lg text-white/70">Her finder du svar på de spørgsmål, vi oftest modtager.</p>
          </div>
        </section>

        <section className="mx-auto max-w-4xl space-y-10 px-4 py-14">
          {categories.map((cat) => (
            <section key={cat.title}>
              <h2 className="mb-5 font-serif text-3xl font-bold text-[#063f32]">{cat.title}</h2>
              <div className="space-y-4">
                {cat.items.map((item) => (
                  <details key={item.q} className="rounded-2xl border border-[#e7e1d7] bg-white p-6">
                    <summary className="cursor-pointer text-lg font-semibold text-[#063f32]">{item.q}</summary>
                    <div className="mt-4 leading-7 text-stone-600">{item.a}</div>
                  </details>
                ))}
              </div>
            </section>
          ))}

          <section className="rounded-3xl border border-[#d4af37]/30 bg-[#fffdf7] p-8">
            <h2 className="font-serif text-3xl font-bold text-[#063f32]">Fandt du ikke svar?</h2>
            <p className="mt-4 text-stone-600">Du kan også besøge vores hjælpesider eller kontakte os.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/hjaelp/sikker-handel" className="rounded-full border px-5 py-3">Guide til sikker handel</Link>
              <Link href="/hjaelp/tvister" className="rounded-full border px-5 py-3">Sådan behandler vi tvister</Link>
              <Link href="/handelsbetingelser" className="rounded-full border px-5 py-3">Handelsbetingelser</Link>
              <a href="mailto:support@equishopper.dk" className="rounded-full bg-[#063f32] px-5 py-3 text-white">Kontakt support</a>
            </div>
          </section>
        </section>
      </main>
    </>
  );
}