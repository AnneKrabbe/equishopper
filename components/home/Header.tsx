import Link from "next/link";
import { HeartIcon } from "@heroicons/react/24/solid";
import { Menu, X } from "lucide-react";

export default function Header() {
  return (
    <header className="fixed top-0 z-[9999] w-full bg-[#063f32]/95 backdrop-blur">
      <input id="mobile-menu-toggle" type="checkbox" className="peer hidden" />

      <div className="mx-auto flex h-20 max-w-[1800px] items-center justify-between px-4 md:h-24 md:px-8">
        <Link href="/">
          <img
            src="/images/equishopper-logo.png"
            alt="Equishopper"
            className="h-24 w-24 translate-y-5 md:h-24 md:w-24 md:translate-y-6"
          />
        </Link>

        <nav className="hidden gap-10 text-sm uppercase tracking-[0.18em] text-[#d4af37] md:flex">
          <Link href="/">Forside</Link>
          <Link href="/newest">Annoncer</Link>
          <Link href="/category/til-hesten">Kategorier</Link>
          <Link href="/">Nyheder</Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/favorites"
            aria-label="Favoritter"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d4af37]"
          >
            <HeartIcon className="h-6 w-6 text-[#d4af37]" />
          </Link>

          <Link
            href="/login"
            className="hidden rounded-full border border-[#d4af37] px-5 py-2.5 text-sm text-white md:inline-block"
          >
            Log ind
          </Link>

          <Link
            href="/sell"
            className="hidden rounded-full bg-[#d4af37] px-5 py-2.5 text-sm font-medium text-black md:inline-block"
          >
            Opret
          </Link>

          <label
            htmlFor="mobile-menu-toggle"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-[#d4af37] text-black md:hidden"
          >
            <Menu size={24} />
          </label>
        </div>
      </div>

      <div
        className="fixed left-0 top-0 z-[999999] hidden h-dvh w-dvw px-8 py-10 text-[#d4af37] peer-checked:block md:hidden"
        style={{ backgroundColor: "#063f32" }}
      >
        <div className="mb-12 flex items-center justify-between">
          <p className="text-xl uppercase tracking-[0.35em]">Menu</p>

          <label
            htmlFor="mobile-menu-toggle"
            className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-[#d4af37]"
          >
            <X size={28} />
          </label>
        </div>

        <nav className="flex flex-col gap-6 text-xl font-medium">
          <Link href="/">Forside</Link>
          <Link href="/newest">Annoncer</Link>
          <Link href="/category/til-hesten">Kategorier</Link>
          <Link href="/">Nyheder</Link>
          <Link href="/favorites">Favoritter</Link>
          <Link href="/login">Log ind</Link>

          <Link
            href="/sell"
            className="mt-6 inline-flex w-fit rounded-full bg-[#d4af37] px-7 py-4 text-base text-black"
          >
            Opret annonce
          </Link>
        </nav>
      </div>
    </header>
  );
}