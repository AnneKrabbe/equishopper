import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type DawaAutocompleteItem = {
  tekst?: string;
  adresse?: {
    id?: string;
    vejnavn?: string;
    husnr?: string;
    etage?: string | null;
    dør?: string | null;
    postnr?: string;
    postnrnavn?: string;
    x?: number;
    y?: number;
  };
};

function buildStreetAddress(address: DawaAutocompleteItem["adresse"]) {
  if (!address) return "";

  const street = [address.vejnavn, address.husnr].filter(Boolean).join(" ");
  const unit = [address.etage, address.dør].filter(Boolean).join(". ");

  return unit ? `${street}, ${unit}` : street;
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
    per_side: "8",
  });

  if (/^\d{4}$/.test(postalCode)) {
    params.set("postnr", postalCode);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(
      `https://api.dataforsyningen.dk/adresser/autocomplete?${params.toString()}`,
      {
        signal: controller.signal,
        cache: "no-store",
        headers: { Accept: "application/json" },
      },
    );

    if (!response.ok) {
      console.error(
        "Dataforsyningen returnerede fejl:",
        response.status,
        response.statusText,
      );
      return NextResponse.json({ suggestions: [] });
    }

    const results = (await response.json()) as DawaAutocompleteItem[];

    const suggestions = results
      .map((item) => {
        const address = item.adresse;
        const id = address?.id;
        const streetAddress = buildStreetAddress(address);

        if (!id || !streetAddress || !address?.postnr || !address?.postnrnavn) {
          return null;
        }

        return {
          id,
          text:
            item.tekst ??
            `${streetAddress}, ${address.postnr} ${address.postnrnavn}`,
          address: streetAddress,
          postalCode: address.postnr,
          city: address.postnrnavn,
          latitude: typeof address.y === "number" ? address.y : null,
          longitude: typeof address.x === "number" ? address.x : null,
        };
      })
      .filter((item) => item !== null);

    return NextResponse.json({ suggestions });
  } catch (error) {
    if (error instanceof Error && error.name !== "AbortError") {
      console.error("Adresseopslag fejlede:", error);
    }

    // Fail-open: autocomplete må aldrig blokere manuel registrering.
    return NextResponse.json({ suggestions: [] });
  } finally {
    clearTimeout(timeout);
  }
}
