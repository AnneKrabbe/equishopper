import Link from "next/link";

export default function Hero() {
  return (
    <section className="bg-[#021511] pt-20 md:pt-24">
      <div className="mx-auto grid min-h-[560px] max-w-[1800px] grid-cols-[52%_48%] overflow-hidden md:grid-cols-[42%_58%]">
        <div className="flex items-center px-6 py-12 text-white md:px-14 md:py-16">
          <div className="max-w-xl">
            <h1 className="font-serif text-[44px] leading-[0.98] md:text-7xl">
              Brugt
              <br />
              rideudstyr
              <br />
              & tilbehør
            </h1>

            <p className="mt-6 max-w-sm text-[15px] leading-7 text-stone-100 md:text-lg">
              Køb og sælg kvalitetsudstyr til hest og rytter — nemt, sikkert og bæredygtigt.
            </p>

            <div className="mt-7 flex max-w-md rounded-full bg-white p-1.5 md:p-2">
              <input
                className="min-w-0 flex-1 rounded-full px-5 py-3 text-sm text-black outline-none md:px-8 md:py-5"
                placeholder="Søg efter udstyr..."
              />

              <button className="rounded-full bg-[#d4af37] px-5 text-sm text-black md:px-7">
                Søg
              </button>
            </div>

            <div className="mt-6 flex flex-col gap-2 text-sm text-stone-100 md:flex-row md:gap-6">
              <span>✓ Sikkert salg</span>
              <span>✓ Verificerede brugere</span>
              <span>✓ Bæredygtigt valg</span>
            </div>
          </div>
        </div>

        <div
          className="relative bg-cover bg-center"
          style={{ backgroundImage: "url('/images/hero-horse.png')" }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#021511] via-[#021511]/35 to-transparent" />
        </div>
      </div>
    </section>
  );
}