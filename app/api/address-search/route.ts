import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Klimadatastyrelsens Adressevælger erstatter DAWA/GSearch.
// Returnerer samme suggestions-format som Opret bruger og Min profil bruger.
const BASE_URL = "https://adressevaelger.dk";
const TOKEN = "adressevaelger123"; // KDS' offentligt anbefalede token.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type SearchHit = {
  type?: string;
  id?: string;
  titel?: string;
  vejnavn?: string;
  vejNavn?: string;
  husnummer?: string;
  husNummer?: string;
  postnr?: string;
  postdistrikt?: string;
};
type SearchResponse = { fund?: SearchHit[] };
type HouseNumber = {
  vejnavn?: string;
  husnummertekst?: string;
  postnummer?: { postnr?: string; navn?: string };
  adgangspunkt?: {
    koordinater?: { x?: number; y?: number };
    geometri?: { coordinates?: number[] };
  };
};
type AddressDetails = {
  adresse?: {
    etagebetegnelse?: string | null;
    doerbetegnelse?: string | null;
    husnummer?: HouseNumber;
  };
  husnummer?: HouseNumber;
};
type Suggestion = {
  kind: "street" | "address";
  id: string;
  text: string;
  address: string;
  postalCode: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
};

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(6500),
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Adressevælger svarede ${response.status}`);
  return (await response.json()) as T;
}

/** ETRS89 / UTM 32N (EPSG:25832) til WGS84 bredde- og længdegrad. */
function toWgs84(x: number, y: number) {
  if (!Number.isFinite(x) || !Number.isFinite(y) ||
      x < 250000 || x > 950000 || y < 5900000 || y > 6550000) {
    return { latitude: null, longitude: null };
  }
  const a = 6378137;
  const f = 1 / 298.257222101;
  const k0 = 0.9996;
  const e2 = f * (2 - f);
  const ep2 = e2 / (1 - e2);
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const mu = (y / k0) /
    (a * (1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256));
  const phi1 = mu +
    (3 * e1 / 2 - 27 * e1 ** 3 / 32) * Math.sin(2 * mu) +
    (21 * e1 ** 2 / 16 - 55 * e1 ** 4 / 32) * Math.sin(4 * mu) +
    (151 * e1 ** 3 / 96) * Math.sin(6 * mu) +
    (1097 * e1 ** 4 / 512) * Math.sin(8 * mu);
  const sinPhi = Math.sin(phi1);
  const cosPhi = Math.cos(phi1);
  const tanSq = Math.tan(phi1) ** 2;
  const c1 = ep2 * cosPhi ** 2;
  const n1 = a / Math.sqrt(1 - e2 * sinPhi ** 2);
  const r1 = a * (1 - e2) / (1 - e2 * sinPhi ** 2) ** 1.5;
  const d = (x - 500000) / (n1 * k0);
  const lat = phi1 - (n1 * Math.tan(phi1) / r1) *
    (d ** 2 / 2 -
      (5 + 3 * tanSq + 10 * c1 - 4 * c1 ** 2 - 9 * ep2) * d ** 4 / 24 +
      (61 + 90 * tanSq + 298 * c1 + 45 * tanSq ** 2 - 252 * ep2 - 3 * c1 ** 2) * d ** 6 / 720);
  const lon = (9 * Math.PI / 180) +
    (d - (1 + 2 * tanSq + c1) * d ** 3 / 6 +
      (5 - 2 * c1 + 28 * tanSq - 3 * c1 ** 2 + 8 * ep2 + 24 * tanSq ** 2) * d ** 5 / 120) / cosPhi;
  return { latitude: lat * 180 / Math.PI, longitude: lon * 180 / Math.PI };
}

async function expandHit(hit: SearchHit): Promise<Suggestion | null> {
  const type = hit.type?.toLowerCase();
  if ((type !== "adresse" && type !== "husnummer") ||
      !hit.id || !UUID.test(hit.id) || !hit.titel) return null;

  const endpoint = type === "adresse" ? "adresser" : "husnumre";
  try {
    const details = await getJson<AddressDetails>(
      `${BASE_URL}/${endpoint}/${hit.id}?token=${TOKEN}`
    );
    const house = details.adresse?.husnummer ?? details.husnummer;
    if (!house) return null;

    const x = house.adgangspunkt?.koordinater?.x ??
      house.adgangspunkt?.geometri?.coordinates?.[0];
    const y = house.adgangspunkt?.koordinater?.y ??
      house.adgangspunkt?.geometri?.coordinates?.[1];
    const coordinates = typeof x === "number" && typeof y === "number"
      ? toWgs84(x, y)
      : { latitude: null, longitude: null };

    const street = [house.vejnavn, house.husnummertekst].filter(Boolean).join(" ");
    const unit = [details.adresse?.etagebetegnelse, details.adresse?.doerbetegnelse]
      .filter(Boolean).join(". ");
    const postalCode = house.postnummer?.postnr ?? null;
    if (!street || !postalCode || !/^\d{4}$/.test(postalCode)) return null;

    return {
      kind: "address",
      id: hit.id,
      text: hit.titel,
      address: unit ? `${street}, ${unit}` : street,
      postalCode,
      city: house.postnummer?.navn ?? null,
      ...coordinates,
    };
  } catch (error) {
    console.warn("Adresse-id kunne ikke slås op:", error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const postalCode = request.nextUrl.searchParams.get("postalCode")?.trim() ?? "";
  if (query.length < 2) return NextResponse.json({ suggestions: [] });
  if (query.length > 73) {
    return NextResponse.json(
      { suggestions: [], error: "Søgeteksten er for lang." }, { status: 400 }
    );
  }

  const params = new URLSearchParams({
    tekst: query,
    token: TOKEN,
    maksimum: "40",
  });
  if (/^\d{4}$/.test(postalCode)) params.set("postnummer", postalCode);

  try {
    const response = await getJson<SearchResponse>(
      `${BASE_URL}/adresser/soeg?${params.toString()}`
    );
    const hits = Array.isArray(response.fund) ? response.fund : [];
    // Vejnavne er et reelt søgeresultat hos KDS og må ikke skjules.
    // Brugeren vælger først vejnavn, og indtaster derefter husnummer.
    const streetHits = hits
      .filter((hit) =>
        ["vejnavn", "navngivenvejpostnummer", "vejnavnhusnummer"]
          .includes((hit.type ?? "").toLowerCase())
      )
      .map((hit): Suggestion | null => {
        const name = (hit.vejnavn ?? hit.vejNavn ?? "").trim();
        const roadName = name || (
          hit.type === "vejnavn" ? (hit.titel ?? "").trim() : ""
        );
        if (!roadName) return null;

        const number = (hit.husnummer ?? hit.husNummer ?? "").trim();
        const isStreetWithNumber = hit.type === "vejnavnhusnummer";
        const address = isStreetWithNumber && number
          ? `${roadName} ${number}`
          : roadName;
        const postalCode = hit.postnr && /^\\d{4}$/.test(hit.postnr)
          ? hit.postnr
          : null;
        return {
          kind: "street",
          id: hit.id ?? `street-${address}-${postalCode ?? ""}`,
          text: hit.titel ?? address,
          address,
          postalCode,
          city: hit.postdistrikt ?? null,
          latitude: null,
          longitude: null,
        };
      })
      .filter((hit): hit is Suggestion => hit !== null);

    // Hent kun detaljer for et begrænset antal præcise adresser.
    // En større søgepulje gør det muligt at finde også høje husnumre
    // ved at skrive nummeret, uden at hente 40 detaljeopslag per tast.
    const addressHits = hits
      .filter((hit) =>
        hit.type === "adresse" || hit.type === "husnummer"
      )
      .slice(0, 16);
    const expanded = await Promise.all(addressHits.map(expandHit));
    const addressSuggestions = expanded.filter(
      (item): item is Suggestion => item !== null
    );

    // Undgå dubletter, fx samme vejnavn på to hits uden postnummer.
    const seen = new Set<string>();
    const suggestions = [...streetHits, ...addressSuggestions]
      .filter((hit) => {
        const key = [hit.kind, hit.address, hit.postalCode ?? ""].join("|");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 24);
    return NextResponse.json({ suggestions }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Adresseopslag fejlede:", error);
    return NextResponse.json({
      suggestions: [],
      error: "Adresseforslag er midlertidigt utilgængelige.",
    }, { status: 503 });
  }
}
