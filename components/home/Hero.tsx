export default function Hero() {
  return (
    <section className="relative pt-20 md:pt-24">
      <div className="relative h-[560px] overflow-hidden md:h-[700px]">
        <img
          src="/images/hero-horse.png"
          alt="Hero"
          className="absolute inset-0 h-full w-full object-cover object-[center_22%]"
        />

        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/58" />

        <div className="absolute inset-0 flex items-end pb-8 md:pb-12">
       <div className="mx-auto flex h-full w-full max-w-[1800px] items-end px-6 md:px-16">
  <div className="max-w-xl md:mb-24 md:ml-0 lg:-ml-24 xl:-ml-5">

              <p className="mb-5 text-[12px] uppercase tracking-[0.38em] text-[#d4af37]">
                Premium secondhand til hest & rytter
              </p>

              <div className="mb-7 flex max-w-xl rounded-full bg-white p-2 shadow-2xl">
                <input
                  className="min-w-0 flex-1 rounded-full px-6 py-4 text-sm text-black outline-none"
                  placeholder="Søg efter sadler, trenser..."
                />

                <button className="rounded-full bg-[#d4af37] px-7 py-4 text-sm font-semibold text-black transition hover:brightness-95">
                  Søg
                </button>
              </div>

              <p className="max-w-lg text-lg leading-8 text-white/95">
                Køb og sælg kvalitetsudstyr til hest og rytter – nemt, sikkert
                og bæredygtigt.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}