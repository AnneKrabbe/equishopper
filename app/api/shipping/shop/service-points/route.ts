import { NextRequest, NextResponse } from "next/server";

import { shipmondoRequest } from "@/lib/shipping/shipmondo";

export const runtime = "nodejs";

type Carrier = "gls" | "postnord";

type ShipmondoServicePoint = {
  id?: string | number;
  number?: string | number;
  name?: string | null;
  company_name?: string | null;
  address?: string | null;
  address1?: string | null;
  zipcode?: string | null;
  postal_code?: string | null;
  city?: string | null;
  distance?: string | number | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  opening_hours?: string[] | null;
};

const products: Record<Carrier, { carrierCode: string; productCode: string; name: string }> = {
  gls: { carrierCode: "gls", productCode: "GLSDK_SD", name: "GLS" },
  postnord: { carrierCode: "pdk", productCode: "PDK_MC", name: "PostNord" },
};

function toFiniteNumber(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const carrier = searchParams.get("carrier")?.trim().toLowerCase() ?? "";
    const address = searchParams.get("address")?.trim() ?? "";
    const zipCode = searchParams.get("zipCode")?.trim() ?? "";
    const city = searchParams.get("city")?.trim() ?? "";

    if (carrier !== "gls" && carrier !== "postnord") {
      return NextResponse.json(
        { error: "Vælg GLS eller PostNord." },
        { status: 400 },
      );
    }
    if (!address || !city || !/^\d{4}$/.test(zipCode)) {
      return NextResponse.json(
        { error: "Indtast adresse, dansk postnummer og by." },
        { status: 400 },
      );
    }

    const product = products[carrier];
    const params = new URLSearchParams({
      carrier_code: product.carrierCode,
      product_code: product.productCode,
      country_code: "DK",
      address,
      zipcode: zipCode,
      city,
    });

    const result = await shipmondoRequest<ShipmondoServicePoint[]>(
      `/pickup_points?${params.toString()}`,
      { method: "GET" },
    );

    const servicePoints = (Array.isArray(result) ? result : [])
      .map((point) => ({
        id: String(point.number ?? point.id ?? "").trim(),
        name: point.name?.trim() || point.company_name?.trim() || `${product.name} pakkeshop`,
        address: point.address1?.trim() || point.address?.trim() || "",
        postalCode: point.postal_code?.trim() || point.zipcode?.trim() || "",
        city: point.city?.trim() || "",
        distance: toFiniteNumber(point.distance),
        latitude: toFiniteNumber(point.latitude),
        longitude: toFiniteNumber(point.longitude),
        openingHours: Array.isArray(point.opening_hours) ? point.opening_hours : [],
      }))
      .filter((point) => point.id)
      .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
      .slice(0, 5);

    return NextResponse.json({ servicePoints });
  } catch (error) {
    console.error("GLS/PostNord-pakkeshops kunne ikke hentes:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Pakkeshops kunne ikke hentes.",
      },
      { status: 500 },
    );
  }
}
