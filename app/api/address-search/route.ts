import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type GSearchAddress = {
  id?: string;
  visningstekst?: string;
  vejnavn?: string;
  husnummer?: string;
  etagebetegnelse?: string | null;
  doerbetegnelse?: string | null;
  postnummer?: string;
  postnummernavn?: string;
  geometri?: unknown;
};

function getCoordinates(geometry: unknown): {
  latitude: number | null;
  longitude: number | null;
} {
  if (!geometry || typeof geometry !== "object") {
    return { latitude: null, longitude: null };
  }

  const value = geometry as {
    coordinates?: unknown;
    x?: unknown;
    y?: unknown;
  };

  // GeoJSON Point i EPSG:4326: [longitude, latitude]
  if (
    Array.isArray(value.coordinates) &&
    typeof value.coordinates[0] === "number" &&
    typeof value.coordinates[1] === "number"
  ) {
    return {
      longitude: value.coordinates[0],
      latitude: value.coordinates[1],
    };
  }

  // Defensiv fallback hvis API'et serialiserer punktet som x/y.
  if (typeof value.x === "number" && typeof value.y === "number") {
    return {
      longitude: value.x,
      latitude: value.y,
    };
  }

  return { latitude: null, longitude: null };
}

function buildStreetAddress(item: GSearchAddress) {
  const street = [item.vejnavn, item.husnummer].filter(Boolean).join(" ");
  const unit = [item.etagebetegnelse, item.doerbetegnelse]
    .filter(Boolean)
    .join(". ");

  if (!street) {
    const full = item.visningstekst?.trim() ?? "";
    const postalCode = item.postnummer?.trim();

    if (postalCode) {
      const marker = `, ${postalCode}`;
      const index = full.lastIndexOf(marker);

      if (index > 0) {
        return full.slice(0, index).trim();
      }
    }

    return full;
  }

  return unit ? `${street}, ${unit}` : street;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const postalCode =
    request.nextUrl.searchParams.get("postalCode")?.trim() ?? "";

  if (query.length < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  const token = process.env.DATAFORSYNINGEN_TOKEN;

  if (!token) {
    console.error(
      "Adresseopslag: DATAFORSYNINGEN_TOKEN mangler i environment variables.",
    );

    return NextResponse.json(
      {
        suggestions: [],
        error: "Adresseforslag er midlertidigt utilgængelige.",
      },
      { status: 503 },
    );
  }

  const params = new URLSearchParams({
    q: query,
    limit: "20",
    srid: "4326",
  });

  // GSearch bruger ECQL til ekstra filtrering.
  if (/^\d{4}$/.test(postalCode)) {
    params.set("filter", `postnummer='${postalCode}'`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(
      `https://api.dataforsyningen.dk/rest/gsearch/v2.0/adresse?${params.toString()}`,
      {
        signal: controller.signal,
        cache: "no-store",
        headers: {
          Accept: "application/json",
          token,
        },
      },
    );

    if (!response.ok) {
      const body = await response.text().catch(() => "");

      console.error(
        "GSearch adresseopslag fejl:",
        response.status,
        response.statusText,
        body.slice(0, 500),
      );

      return NextResponse.json(
        {
          suggestions: [],
          error: "Adresseforslag er midlertidigt utilgængelige.",
        },
        { status: 503 },
      );
    }

    const results = (await response.json()) as GSearchAddress[];

    const suggestions = results
      .map((item, index) => {
        const text = item.visningstekst?.trim();
        const address = buildStreetAddress(item);

        if (!text || !address) {
          return null;
        }

        const coordinates = getCoordinates(item.geometri);

        return {
          id: item.id ?? `${index}-${text}`,
          text,
          address,
          postalCode: item.postnummer?.trim() || null,
          city: item.postnummernavn?.trim() || null,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        };
      })
      .filter(
        (
          item,
        ): item is {
          id: string;
          text: string;
          address: string;
          postalCode: string | null;
          city: string | null;
          latitude: number | null;
          longitude: number | null;
        } => item !== null,
      );

    return NextResponse.json({ suggestions });
  } catch (error) {
    if (error instanceof Error && error.name !== "AbortError") {
      console.error("GSearch adresseopslag kunne ikke hentes:", error);
    }

    return NextResponse.json(
      {
        suggestions: [],
        error: "Adresseforslag er midlertidigt utilgængelige.",
      },
      { status: 503 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
