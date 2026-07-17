import Link from "next/link";

export default function ExploreCategories() {
  const categories = [
{
  label: "Til hesten",
  icon: "/images/horse-head.png",
  href: "/category/til-hesten",
  className: "h-16 w-16 scale-[2.2] object-contain md:h-20 md:w-20 md:scale-[2.4]",
},
{
  label: "Til rytteren",
  icon: "/images/horse-rider.png",
  href: "/category/til-rytteren",
  className: "h-16 w-16 scale-[2.2] object-contain md:h-20 md:w-20 md:scale-[2.4]",
},
{
  label: "Til stalden",
  icon: "/images/stable.png",
  href: "/category/til-stalden",
  className: "h-16 w-16 scale-[2.2] object-contain md:h-20 md:w-20 md:scale-[2.4]",
},
  ];

  return (
    <section className="bg-[#f8f6f1] px-4 pb-16 pt-12 md:px-8 md:pb-20 md:pt-8">
      <div className="mx-auto max-w-5xl">
        <p className="mb-8 text-center text-[12px] uppercase tracking-[0.5em] text-[#b79a3d] md:mb-12">
          Udforsk
        </p>

        <div className="grid grid-cols-3 gap-8 md:gap-20">
          {categories.map((category) => (
            <Link
              key={category.label}
              href={category.href}
              className="group flex flex-col items-center text-center"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[#d4af37]/60 bg-[#fbfaf7] shadow-sm transition duration-300 group-hover:-translate-y-1 group-hover:shadow-lg md:h-32 md:w-32">
                <img src={category.icon} alt="" className={category.className} />
              </div>

              <p className="mt-3 text-[14px] font-medium text-[#063f32] transition group-hover:text-[#b79a3d] md:text-[16px]">
                {category.label}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}