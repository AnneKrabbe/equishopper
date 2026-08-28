import { NextRequest, NextResponse } from "next/server";

import { shipmondoRequest } from "@/lib/shipping/shipmondo";

export const runtime = "nodejs";

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

  country?: string | null;
  country_code?: string | null;

  distance?: number | string | null;

  latitude?: number | string | null;
  longitude?: number | string | null;

  opening_hours?: string[] | null;
};

function toFiniteNumber(
  value: number | string | null | undefined,
): number | null {
  if (value == null || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

export async function GET(
  request: NextRequest,
) {
  try {
    const { searchParams } = new URL(request.url);

    const address =
      searchParams.get("address")?.trim() ?? "";

    const zipCode =
      searchParams.get("zipCode")?.trim() ?? "";

    const city =
      searchParams.get("city")?.trim() ?? "";

    if (!address) {
      return NextResponse.json(
        {
          error:
            "Indtast en adresse for at finde de nærmeste DAO-pakkeshops.",
        },
        { status: 400 },
      );
    }

    if (!/^\d{4}$/.test(zipCode)) {
      return NextResponse.json(
        {
          error:
            "Indtast et gyldigt dansk postnummer.",
        },
        { status: 400 },
      );
    }

    if (!city) {
      return NextResponse.json(
        {
          error:
            "Indtast en by for at finde de nærmeste DAO-pakkeshops.",
        },
        { status: 400 },
      );
    }

    /*
     * Shipmondo /pickup_points kan bruges til at finde
     * nærmeste service points ud fra kundens adresse.
     *
     * Vi sender både adresse, postnummer og by, så
     * Shipmondo kan beregne afstand fra den faktiske
     * leveringsadresse i stedet for kun postnummeret.
     *
     * DAO_STS = daoSHOP / Shop-to-Shop.
     */
    const params = new URLSearchParams({
      carrier_code: "DAO",
      product_code: "DAO_STS",
      country_code: "DK",
      address,
      zipcode: zipCode,
      city,
    });

    const result =
      await shipmondoRequest<
        ShipmondoServicePoint[]
      >(
        `/pickup_points?${params.toString()}`,
        {
          method: "GET",
        },
      );

    const servicePoints = (
      Array.isArray(result) ? result : []
    )
      .map((point) => {
        /*
         * Shipmondo bruger service point-numberet/id'et,
         * når shipment senere oprettes.
         */
        const id = String(
          point.number ??
            point.id ??
            "",
        ).trim();

        const distance =
          toFiniteNumber(point.distance);

        return {
          id,

          name:
            point.name?.trim() ||
            point.company_name?.trim() ||
            "DAO pakkeshop",

          address:
            point.address1?.trim() ||
            point.address?.trim() ||
            "",

          postalCode:
            point.postal_code?.trim() ||
            point.zipcode?.trim() ||
            "",

          city:
            point.city?.trim() || "",

          distance,

          latitude:
            toFiniteNumber(point.latitude),

          longitude:
            toFiniteNumber(point.longitude),

          openingHours:
            Array.isArray(point.opening_hours)
              ? point.opening_hours
              : [],
        };
      })
      .filter((point) => point.id)
      .sort((a, b) => {
        if (
          a.distance == null &&
          b.distance == null
        ) {
          return 0;
        }

        if (a.distance == null) {
          return 1;
        }

        if (b.distance == null) {
          return -1;
        }

        return a.distance - b.distance;
      })
      .slice(0, 5);

    return NextResponse.json({
      servicePoints,
    });
  } catch (error) {
    console.error(
      "DAO-pakkeshops kunne ikke hentes:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "DAO-pakkeshops kunne ikke hentes.",
      },
      { status: 500 },
    );
  }
}
