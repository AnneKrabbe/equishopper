import BrandAutocomplete from "@/components/BrandAutocomplete";

type FilterSidebarProps = {
  categoryName: string;
  listingsCount: number;
};

export default function FilterSidebar({
  categoryName,
  listingsCount,
}: FilterSidebarProps) {
  return (
    <aside className="sticky top-8 h-fit rounded-[2rem] border border-stone-200 bg-white p-8">
      <div className="mb-8 flex items-center justify-between">
        <h2 className="font-serif text-3xl text-[#063f32]">
          Filtre
        </h2>

        <button className="text-sm text-stone-500 underline">
          Nulstil alle
        </button>
      </div>

      <div className="space-y-8">
        <div className="border-t border-stone-200 pt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#063f32]">
            Kategori
          </p>

          <button className="flex w-full items-center justify-between rounded-xl border border-stone-200 bg-[#fbfaf7] px-4 py-3 text-left text-sm">
            <span>{categoryName}</span>
            <span className="text-[#d4af37]">⌄</span>
          </button>
        </div>

        {categoryName === "Til hesten" && (
          <div className="border-t border-stone-200 pt-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#063f32]">
              Gruppe
            </p>

            <button className="flex w-full items-center justify-between rounded-xl border border-stone-200 bg-[#fbfaf7] px-4 py-3 text-left text-sm">
              <span>Alle grupper</span>
              <span className="text-[#d4af37]">⌄</span>
            </button>
          </div>
        )}

        <div className="border-t border-stone-200 pt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#063f32]">
            Underkategori
          </p>

          <button className="flex w-full items-center justify-between rounded-xl border border-stone-200 bg-[#fbfaf7] px-4 py-3 text-left text-sm">
            <span>Alle underkategorier</span>
            <span className="text-[#d4af37]">⌄</span>
          </button>
        </div>

        <div className="border-t border-stone-200 pt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#063f32]">
            Brand
          </p>

          <BrandAutocomplete />
        </div>

        <div className="border-t border-stone-200 pt-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-[#063f32]">
            Pris
          </p>

          <div className="mb-3 flex justify-between text-sm text-stone-500">
            <span>0 kr.</span>
            <span>50.000 kr.</span>
          </div>

          <input
            type="range"
            min="0"
            max="50000"
            className="w-full accent-[#063f32]"
          />
        </div>

        <div className="border-t border-stone-200 pt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#063f32]">
            Afstand
          </p>

          <input
            placeholder="Postnummer"
            className="mb-3 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none"
          />

          <button className="flex w-full items-center justify-between rounded-xl border border-stone-200 bg-[#fbfaf7] px-4 py-3 text-left text-sm">
            <span>Maks. afstand</span>
            <span className="text-[#d4af37]">⌄</span>
          </button>
        </div>

        <div className="border-t border-stone-200 pt-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-[#063f32]">
            Stand
          </p>

          <div className="space-y-3 text-sm text-[#063f32]">
            {["Som ny", "Meget god", "God", "Brugt"].map((condition) => (
              <label key={condition} className="flex items-center gap-3">
                <input
                  type="radio"
                  name="condition"
                  className="h-4 w-4 accent-[#063f32]"
                />
                <span>{condition}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="border-t border-stone-200 pt-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-[#063f32]">
            Størrelse
          </p>

          <div className="flex flex-wrap gap-2">
            {["Cob", "Full", "Pony", "X-Full", "105", "145"].map((size) => (
              <button
                key={size}
                className="rounded-full border border-stone-200 px-4 py-2 text-sm text-[#063f32] hover:border-[#d4af37]"
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <button className="w-full rounded-xl bg-[#063f32] px-5 py-4 text-sm font-medium text-white">
          Vis {listingsCount} annoncer
        </button>
      </div>
    </aside>
  );
}