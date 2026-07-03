import Link from "next/link";
import { HeartIcon as HeartIconOutline } from "@heroicons/react/24/outline";

export default function ExploreCategories() {
  const categories = [
    {
      label: "Til hesten",
      icon: "/images/horse-head.png",
      href: "/category/til-hesten",
      className:
        "h-16 w-16 scale-150 object-contain md:h-[96px] md:w-[96px] md:scale-175",
    },
    {
      label: "Til rytteren",
      icon: "/images/horse-rider.png",
      href: "/category/til-rytteren",
      className:
        "h-16 w-16 scale-150 object-contain md:h-[96px] md:w-[96px] md:scale-175",
    },
    {
      label: "Til stalden",
      icon: "/images/stable.png",
      href: "/category/til-stalden",
      className:
        "h-16 w-16 scale-125 object-contain md:h-[86px] md:w-[86px] md:scale-150",
    },
  ];

  return (
    <section className="relative z-20 bg-[#f8f6f1] px-4 pb-10 md:px-8 md:pb-12">
      <div className="relative -top-10 mx-auto max-w-7xl rounded-[2rem] bg-[#fbfaf7] px-5 py-7 shadow-[0_18px_45px_rgba(0,0,0,0.08)] md:-top-14 md:px-12 md:py-6">
        <p className="mb-5 text-xs uppercase tracking-[0.35em] text-[#b79a3d] md:mb-2">
          Udforsk
        </p>

        <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4 md:gap-8">
          {categories.map((category) => (
            <Link
              key={category.label}
              href={category.href}
              className="group flex flex-col items-center justify-center text-center"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#cfb45a] text-[#063f32] shadow-sm transition duration-300 group-hover:-translate-y-1 group-hover:scale-105 md:h-[92px] md:w-[92px]">
                <img
                  src={category.icon}
                  alt=""
                  className={category.className}
                />
              </div>

              <div className="mt-4 flex items-center justify-center gap-2 text-center text-[15px] font-normal text-[#063f32] md:text-[17px]">
                <span>{category.label}</span>
                <span className="text-[#d4af37] transition group-hover:translate-x-1">
                  →
                </span>
              </div>
            </Link>
          ))}

          <Link
            href="/favorites"
            className="group flex flex-col items-center justify-center text-center"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#cfb45a] text-[#063f32] shadow-sm transition duration-300 group-hover:-translate-y-1 group-hover:scale-105 md:h-[92px] md:w-[92px]">
              <HeartIconOutline className="h-9 w-9 md:h-11 md:w-11" />
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 text-center text-[15px] font-normal text-[#063f32] md:text-[17px]">
              <span>Favoritter</span>
              <span className="text-[#d4af37] transition group-hover:translate-x-1">
                →
              </span>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}