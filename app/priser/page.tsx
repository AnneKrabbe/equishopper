import Link from "next/link";

import Header from "@/components/home/Header";
import { calculateBuyerProtectionOere, calculateShippingOere } from "@/lib/checkout-pricing";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const SHIPPING_CARRIERS = [
  { id: "dao", group: "dao_shop", name: "DAO" },
  { id: "gls", group: "gls_shop", name: "GLS" },
  { id: "postnord", group: "postnord_shop", name: "PostNord" },
];
const SHIPPING_WEIGHTS = [1000, 5000, 10000, 15000];

const kroner = new Intl.NumberFormat("da-DK", {
  style: "currency",
  currency: "DKK",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});
const exampleItemPriceOere = 100_000;
const exampleBuyerProtectionOere = calculateBuyerProtectionOere(exampleItemPriceOere);

async function ShippingPrices() {
  const { data, error } = await supabaseAdmin
    .from("shipping_products")
    .select("carrier, package_group, max_weight_grams, price_amount")
    .in("carrier", SHIPPING_CARRIERS.map((carrier) => carrier.id))
    .in("max_weight_grams", SHIPPING_WEIGHTS)
    .eq("active", true)
    .eq("outbound_enabled", true)
    .ilike("currency", "dkk")
    .gt("price_amount", 0);

  if (error) {
    console.error("Fragtpriserne på prissiden kunne ikke hentes:", error);
    return <p>Du kan se den aktuelle fragtpris i kurven.</p>;
  }

  const rates = (data ?? []).filter((rate) =>
    Number.isInteger(rate.price_amount) &&
    SHIPPING_CARRIERS.some((carrier) =>
      carrier.id === rate.carrier && carrier.group === rate.package_group,
    ),
  );
  const weights = SHIPPING_WEIGHTS.filter((weight) =>
    rates.some((rate) => rate.max_weight_grams === weight),
  );

  if (!weights.length) return <p>Du kan se den aktuelle fragtpris i kurven.</p>;

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#eadfcb]">
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">Fragtpriser til pakkeshop</caption>
        <thead className="bg-[#fbfaf7] text-[#063f32]">
          <tr>
            <th scope="col" className="px-3 py-3 sm:px-4">Vægtklasse</th>
            {SHIPPING_CARRIERS.map((carrier) => (
              <th key={carrier.id} scope="col" className="px-3 py-3 text-right sm:px-4">
                {carrier.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weights.map((weight) => (
            <tr key={weight} className="border-t border-[#eadfcb]">
              <th scope="row" className="whitespace-nowrap px-3 py-3 font-medium sm:px-4">
                Op til {weight / 1000} kg
              </th>
              {SHIPPING_CARRIERS.map((carrier) => {
                const rate = rates.find((entry) =>
                  entry.carrier === carrier.id && entry.max_weight_grams === weight,
                );

                return (
                  <td key={carrier.id} className="whitespace-nowrap px-3 py-3 text-right sm:px-4">
                    {rate ? kroner.format(calculateShippingOere(rate.price_amount) / 100) : "–"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

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
          Standardgebyret, når du sælger en vare gennem Equishopper, er{" "}
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
            3 % af vareprisen + 10 kr.
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
          Køberen vælger mellem DAO, GLS og PostNord. Fragtprisen til pakkeshop
          afhænger af fragtfirmaet og pakkens vægtklasse.
        </p>
        <ShippingPrices />
        <p>
          Du ser den samlede pris for din ordre, inklusive fragt,
          inden du betaler. Pakker op til 15 kg kan sendes via Equishopper.
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
            <span>Køberbeskyttelse (3 % + 10 kr.)</span>
            <span>{kroner.format(exampleBuyerProtectionOere / 100)}</span>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-4 bg-[#fbfaf7] px-4 py-3 font-semibold text-[#063f32]">
            <span>Køber betaler i alt</span>
            <span>{kroner.format((exampleItemPriceOere + exampleBuyerProtectionOere) / 100)}</span>
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
            <span>Standardgebyr ved salg (2 %)</span>
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
              Senest opdateret: 20. november 2026
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
