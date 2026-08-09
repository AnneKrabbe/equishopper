"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

type HeroProps = {
  title?: string;
  description?: string;
  image?: string;
  listingsCount?: number;
  showSearch?: boolean;
};

export default function Hero({
  title,
  description = "Køb og sælg kvalitetsudstyr til hest og rytter – nemt, sikkert og bæredygtigt.",
  image = "/images/hero-horse.png",
  listingsCount,
  showSearch = true,
}: HeroProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      router.push("/annoncer");
      return;
    }

    router.push(`/annoncer?q=${encodeURIComponent(trimmedQuery)}`);
  }

  return (
    <section className="relative pt-20 md:pt-24">
      <div className="relative h-[560px] overflow-hidden md:h-[700px]">
        <img
          src={image}
          alt={title || "Equishopper"}
          className="absolute inset-0 h-full w-full object-cover object-[center_22%]"
        />

        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/60" />

        <div className="absolute inset-0 flex items-end pb-8 md:pb-12">
          <div className="mx-auto flex h-full w-full max-w-[1800px] items-end px-6 md:px-16">
            <div className="max-w-xl mb-8 md:mb-22 lg:mb-28 md:ml-0 lg:-ml-24 xl:-ml-5">
              <p className="mb-5 text-[12px] uppercase tracking-[0.38em] text-[#d4af37]">
                Premium secondhand til hest & rytter
              </p>

              {title && (
                <h1 className="mb-6 font-serif text-5xl leading-none text-white md:text-7xl">
                  {title}
                </h1>
              )}

              {showSearch && (
                <div className="mb-7">
                  <form
                    onSubmit={handleSubmit}
                    className="flex max-w-xl rounded-full bg-white p-2 shadow-2xl"
                  >
                    <div className="flex min-w-0 flex-1 items-center pl-4">
                      <Search className="h-5 w-5 shrink-0 text-stone-400" />

                      <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        className="min-w-0 flex-1 rounded-full px-4 py-4 text-sm text-black outline-none placeholder:text-stone-400"
                        placeholder="Søg efter sadler, trenser, dækkener..."
                        aria-label="Søg i annoncer"
                      />
                    </div>

                    <button
                      type="submit"
                      className="rounded-full bg-[#d4af37] px-7 py-4 text-sm font-semibold text-black transition hover:brightness-95"
                    >
                      Søg
                    </button>
                  </form>

                  <Link
                    href="/annoncer"
                    className="mt-3 inline-flex text-sm font-medium text-white underline decoration-white decoration-2 underline-offset-4 transition hover:text-[#d4af37]"
                  >
                    Avanceret søgning
                  </Link>
                </div>
              )}

              <p className="max-w-lg text-lg leading-8 text-white/95">
                {description}
              </p>

              {typeof listingsCount === "number" && (
                <p className="mt-5 text-sm font-medium text-white/85">
                  {listingsCount} annoncer fundet
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}