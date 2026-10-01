import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type DawaAutocompleteItem = {
  tekst?: string;
  adresse?: {
    id?: string;
    x?: number;
    y?: number;
    postnr?: string;
    postnrnavn?: string;
  };
};

function parseAddressText(text: string) {
  const parts = text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const last = parts.at(-1) ?? "";
  const postalMatch = last.match(/^(\d{4})\s+(.+)$/);

  if (!postalMatch) {
    return {
      address: text,
      postalCode: null,
      city: null,
    };
  }

  return {
    address: parts.slice(0, -1).join(", "),
    postalCode: postalMatch[1],
    city: postalMatch[2],
  };
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const postalCode =
    request.nextUrl.searchParams.get("postalCode")?.trim() ?? "";

  if (query.length < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  const params = new URLSearchParams({
    q: query,
    per_side: "10",
  });

  if (/^\d{4}$/.test(postalCode)) {
    params.set("postnr", postalCode);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(
      `https://api.dataforsyningen.dk/adresser/autocomplete?${params.toString()}`,
      {
        signal: controller.signal,
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      console.error(
        "DAWA autocomplete fejl:",
        response.status,
        response.statusText,
      );

      return NextResponse.json({ suggestions: [] });
    }

    const results = (await response.json()) as DawaAutocompleteItem[];

    const suggestions = results
      .map((item, index) => {
        const text = item.tekst?.trim();

        // Det eneste vi kræver for at vise et forslag er selve adresseteksten.
        // Manglende id/koordinater/postnummer må ikke få et gyldigt forslag
        // til at forsvinde fra dropdown-listen.
        if (!text) return null;

        const parsed = parseAddressText(text);

        return {
          id: item.adresse?.id ?? `${index}-${text}`,
          text,
          address: parsed.address,
          postalCode: item.adresse?.postnr ?? parsed.postalCode,
          city: item.adresse?.postnrnavn ?? parsed.city,
          latitude:
            typeof item.adresse?.y === "number" ? item.adresse.y : null,
          longitude:
            typeof item.adresse?.x === "number" ? item.adresse.x : null,
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
      console.error("DAWA autocomplete kunne ikke hentes:", error);
    }

    // Fail-open: adresseopslag må aldrig stoppe brugeroprettelsen.
    return NextResponse.json({ suggestions: [] });
  } finally {
    clearTimeout(timeout);
  }
}
