
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const GA_ID = "G-D3CNDPOEG2";
const STORAGE_KEY = "equishopper-cookie-consent-v1";
const SIX_MONTHS = 180 * 24 * 60 * 60 * 1000;

type Consent = "accepted" | "rejected";

type SavedConsent = {
  choice: Consent;
  savedAt: number;
};

type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

function removeAnalyticsCookies() {
  const names = document.cookie
    .split(";")
    .map((cookie) => cookie.trim().split("=")[0])
    .filter(
      (name) =>
        name === "_ga" ||
        name.startsWith("_ga_") ||
        name === "_gid" ||
        name.startsWith("_gat")
    );

  const domains = [
    "",
    `; domain=${window.location.hostname}`,
    "; domain=equishopper.dk",
    "; domain=.equishopper.dk",
  ];

  for (const name of names) {
    for (const domain of domains) {
      document.cookie =
        `${name}=; Max-Age=0; path=/; SameSite=Lax${domain}`;
    }
  }
}

export default function CookieConsent() {
  const pathname = usePathname();

  const [ready, setReady] = useState(false);
  const [consent, setConsent] = useState<Consent | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const analyticsStarted = useRef(false);

  // Indlæs tidligere cookievalg.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (stored) {
        const saved = JSON.parse(stored) as SavedConsent;

        if (
          (saved.choice === "accepted" ||
            saved.choice === "rejected") &&
          typeof saved.savedAt === "number" &&
          saved.savedAt <= Date.now() &&
          Date.now() - saved.savedAt < SIX_MONTHS
        ) {
          setConsent(saved.choice);
        }
      }
    } catch {
      // Hvis localStorage ikke virker,
      // bliver der ikke automatisk givet samtykke.
    }

    setReady(true);
  }, []);

  // Start kun Google Analytics efter accept.
  useEffect(() => {
    if (!ready || consent !== "accepted" || !pathname) {
      return;
    }

    const analyticsWindow = window as AnalyticsWindow;

    if (!analyticsStarted.current) {
      analyticsStarted.current = true;

      const dataLayer = analyticsWindow.dataLayer || [];
      analyticsWindow.dataLayer = dataLayer;

     
analyticsWindow.gtag = function (..._args: unknown[]) {
  dataLayer.push(arguments);
};


      analyticsWindow.gtag("js", new Date());

      analyticsWindow.gtag("config", GA_ID, {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      });

      const script = document.createElement("script");
      script.async = true;
      script.src =
        `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;

      document.head.appendChild(script);
    }

    // Registrér sidevisninger ved navigation i Next.js.
    analyticsWindow.gtag?.("event", "page_view", {
      send_to: GA_ID,
      page_path: pathname,
      page_location: window.location.origin + pathname,
      page_title: document.title,
    });
  }, [ready, consent, pathname]);

  function saveConsent(choice: Consent) {
    try {
      const saved: SavedConsent = {
        choice,
        savedAt: Date.now(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      // Valget gælder stadig for denne sidevisning.
    }

    if (choice === "rejected") {
      removeAnalyticsCookies();

      // Et allerede indlæst Analytics-script kan ikke
      // afinstalleres sikkert uden en genindlæsning.
      if (consent === "accepted") {
        window.location.reload();
        return;
      }
    }

    setConsent(choice);
    setSettingsOpen(false);
  }

  if (!ready) return null;

  const showBanner = consent === null || settingsOpen;

  return (
    <>
      {showBanner ? (
        <section
          role="region"
          aria-labelledby="cookie-heading"
          className="fixed inset-x-0 bottom-0 z-[9999] mx-auto w-full max-w-2xl rounded-t-2xl border border-green-200 bg-white p-5 text-gray-800 shadow-2xl sm:bottom-5 sm:rounded-2xl"
        >
          <h2
            id="cookie-heading"
            className="mb-2 text-lg font-bold text-green-900"
          >
            Cookies på Equishopper 🐴💚
          </h2>

          <p className="mb-3 text-sm leading-relaxed">
            Vi bruger nødvendige teknologier til at få
            Equishopper til at fungere.
          </p>

          <p className="mb-3 text-sm leading-relaxed">
            Hvis du accepterer statistik, bruger vi
            Google Analytics til at forstå, hvordan
            hjemmesiden bliver brugt, så vi kan forbedre den.
            Statistik er frivillig.
          </p>

          <p className="mb-4 text-xs leading-relaxed text-gray-600">
            Google Analytics leveres af Google LLC og kan
            gemme cookies som _ga og _ga_*, normalt i op til
            2 år. Vi indlæser først Analytics efter accept.
            Du kan altid ændre dit valg via knappen
            "Cookievalg".
            {" "}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Googles privatlivspolitik
            </a>
            .
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => saveConsent("rejected")}
              className="rounded-lg border-2 border-green-800 bg-white px-4 py-3 text-sm font-semibold text-green-900 transition hover:bg-green-50"
            >
              Afvis statistik
            </button>

            <button
              type="button"
              onClick={() => saveConsent("accepted")}
              className="rounded-lg border-2 border-green-800 bg-white px-4 py-3 text-sm font-semibold text-green-900 transition hover:bg-green-50"
            >
              Accepter statistik
            </button>
          </div>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="fixed bottom-3 left-3 z-[9998] rounded-full border border-green-200 bg-white px-3 py-2 text-xs font-medium text-green-900 shadow-md hover:bg-green-50"
          aria-label="Ændr cookieindstillinger"
        >
          Cookievalg
        </button>
      )}
    </>
  );
}
