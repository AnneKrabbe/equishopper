import type { Metadata } from "next";

import Header from "@/components/home/Header";

export const metadata: Metadata = {
  title: "Om Equishopper",
  description:
    "Læs historien om, hvordan Equishopper blev til – en dansk markedsplads skabt for at gøre handel med brugt rideudstyr tryggere.",
  alternates: {
    canonical: "/om-os",
  },
  openGraph: {
    title: "Om Equishopper",
    description:
      "Historien om, hvordan Equishopper blev til – og hvorfor tryg handel med brugt rideudstyr er så vigtig.",
    url: "/om-os",
    type: "website",
  },
};

export default function OmOsPage() {
  return (
    <main className="min-h-screen bg-[#f8f6f1]">
      <Header />

      <section className="mx-auto max-w-4xl px-4 pb-20 pt-32 md:px-8 md:pt-40">
        <div className="rounded-[32px] border border-[#eadfcb] bg-[#fbfaf7] p-7 shadow-[0_18px_45px_rgba(0,0,0,0.06)] md:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b79a3d]">
            Historien bag
          </p>

          <h1 className="mt-3 font-serif text-4xl leading-tight text-[#063f32] md:text-6xl">
            Om Equishopper
          </h1>

          <div className="mt-8 space-y-6 text-base leading-8 text-stone-700 md:text-lg">
            <p>
              Equishopper blev til, da jeg var på jagt efter en brugt sadel og
              endte i kontakt med en svindler. Heldigvis gennemskuede jeg det,
              inden jeg mistede mine penge – men bagefter kunne jeg ikke
              slippe tanken:{" "}
              <strong className="font-semibold text-[#063f32]">
                Hvorfor skal det være så usikkert at handle brugt rideudstyr?
              </strong>
            </p>

            <p>Så jeg besluttede mig for at prøve at gøre noget ved det.</p>

            <p>
              På det tidspunkt var jeg på barsel med min søn, og det blev
              starten på Equishopper. En ret stor del af siden er faktisk kodet
              på diverse caféer rundt omkring på Frederiksberg – med computeren
              foran mig, én hånd på barnevognen og en sovende baby ved siden af.
            </p>

            <p>
              Tanken med Equishopper er ret simpel: Jeg vil gerne skabe et sted,
              hvor vi ryttere kan købe og sælge vores brugte udstyr på en nemmere
              og tryggere måde.
            </p>

            <p>
              Og samtidig få noget af alt det gode udstyr, der ligger i skabe,
              sadelrum og stalde, ud at leve igen hos en ny rytter og hest.
            </p>

            <p className="font-semibold text-[#063f32]">
              Det er sådan Equishopper blev til 💚
            </p>

            <div className="pt-4">
              <p>Kærlig hilsen</p>
              <p className="mt-1 font-semibold text-[#063f32]">
                Anne Dahl Krabbe
              </p>
              <p className="text-stone-500">Stifter af Equishopper</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}