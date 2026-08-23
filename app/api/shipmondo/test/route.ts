import { NextResponse } from "next/server";

import { shipmondoRequest } from "@/lib/shipping/shipmondo";

export async function GET() {
  try {
    const data = await shipmondoRequest<unknown>(
      "/shipments?per_page=1",
    );

    return NextResponse.json({
      ok: true,
      message: "Equishopper har forbindelse til Shipmondo.",
      data,
    });
  } catch (error) {
    console.error(
      "Shipmondo test fejlede:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Ukendt Shipmondo-fejl.",
      },
      { status: 500 },
    );
  }
}