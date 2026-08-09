import Link from "next/link";

const footerSections = [
  {
    title: "Equishopper",
    links: [
      { label: "Om os", href: "/om-os" },
      { label: "Priser og gebyrer", href: "/priser" },
      { label: "Kontakt", href: "mailto:support@equishopper.dk" },
      { label: "Opret bruger", href: "/register" },
      { label: "Log ind", href: "/login" },
    ],
  },
  {
    title: "Hjælp & Tryghed",
    links: [
      {
        label: "Køberbeskyttelse",
        href: "/handelsbetingelser#koeberbeskyttelse",
      },
      {
        label: "Sådan behandler vi tvister",
        href: "/hjaelp/tvister",
      },
      {
        label: "Sikker handel",
        href: "/hjaelp/sikker-handel",
      },
      {
        label: "FAQ",
        href: "/hjaelp/faq",
      },
    ],
  },
  {
    title: "Juridisk",
    links: [
      { label: "Handelsbetingelser", href: "/handelsbetingelser" },
      { label: "Privatlivspolitik", href: "/privatlivspolitik" },
      { label: "Cookiepolitik", href: "/cookiepolitik" },
    ],
  },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-[#063f32] text-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,2fr)]">
          <div>
            <Link
              href="/"
              className="inline-flex font-serif text-3xl font-bold tracking-tight text-white transition hover:text-[#d4af37]"
            >
              Equishopper
            </Link>

            <p className="mt-5 max-w-md text-base leading-7 text-white/65">
              En dansk markedsplads, hvor private kan købe og sælge brugt
              rideudstyr på en enkel og tryg måde.
            </p>

            <a
              href="mailto:support@equishopper.dk"
              className="mt-6 inline-flex text-sm font-semibold text-[#d4af37] underline decoration-white/20 underline-offset-4 transition hover:text-white"
            >
              support@equishopper.dk
            </a>
          </div>

          <div className="grid gap-10 sm:grid-cols-3">
            {footerSections.map((section) => (
              <div key={section.title}>
                <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-[#d4af37]">
                  {section.title}
                </h2>

                <nav className="mt-5 flex flex-col gap-3">
                  {section.links.map((link) =>
                    link.href.startsWith("mailto:") ? (
                      <a
                        key={link.label}
                        href={link.href}
                        className="text-sm text-white/65 transition hover:text-white"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        key={link.label}
                        href={link.href}
                        className="text-sm text-white/65 transition hover:text-white"
                      >
                        {link.label}
                      </Link>
                    ),
                  )}
                </nav>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-7 text-sm text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© {currentYear} Equishopper. Alle rettigheder forbeholdes.</p>

          <p>Dansk markedsplads for brugt rideudstyr.</p>
        </div>
      </div>
    </footer>
  );
}