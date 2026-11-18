import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { shipmondoRequest } from "@/lib/shipping/shipmondo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DocumentItem = { base64?: string | null; file_format?: string | null };
function getDocument(value: unknown, inheritedFormat?: string): DocumentItem | null {
  // Shipmondo sender QR-koder som base64-strenge i qr_codes[].
  if (typeof value === "string") {
    return { base64: value, file_format: inheritedFormat };
  }
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) return getDocument(value[0], inheritedFormat);
  const obj = value as Record<string, unknown>;
  const fileFormat =
    typeof obj.file_format === "string" ? obj.file_format : inheritedFormat;
  if (typeof obj.base64 === "string") {
    return { base64: obj.base64, file_format: fileFormat };
  }
  if (Array.isArray(obj.labels)) return getDocument(obj.labels, fileFormat);
  if (Array.isArray(obj.qr_codes)) return getDocument(obj.qr_codes, fileFormat);
  if (Array.isArray(obj.qr_code)) return getDocument(obj.qr_code, fileFormat);
  return null;
}

export async function GET(request: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (!token) return NextResponse.json({ error: "Log ind for at hente fragtpapirer." }, { status: 401 });
    const { data: auth, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !auth.user) return NextResponse.json({ error: "Ugyldig session." }, { status: 401 });
    const { orderId } = await context.params;
    const { data: order, error } = await supabaseAdmin.from("orders")
      .select("id, seller_id, shipping_carrier, shipping_shipment_id")
      .eq("id", orderId).maybeSingle();
    if (error) throw error;
    if (!order || order.seller_id !== auth.user.id) {
      return NextResponse.json({ error: "Kun sælgeren kan hente fragtpapirer." }, { status: 403 });
    }
    if (!order.shipping_shipment_id || !/^\d+$/.test(String(order.shipping_shipment_id))) {
      return NextResponse.json({ error: "Forsendelsen er ikke oprettet endnu." }, { status: 404 });
    }
    const shipmentId = String(order.shipping_shipment_id);
    const carrier = String(order.shipping_carrier ?? "").toLowerCase();
    if (carrier !== "gls" && carrier !== "postnord") {
      return NextResponse.json({ error: "Brug den eksisterende DAO-fragtkode." }, { status: 400 });
    }
    // Forsøg kun Shipmondos ægte QR-kode. Hvis produktet ikke tillader QR,
    // falder vi tilbage til den printbare label, ikke en selvopfundet QR.
    const preference = request.nextUrl.searchParams.get("format") ?? "auto";
    if (!["auto", "qr", "label"].includes(preference)) {
      return NextResponse.json({ error: "Ugyldigt dokumentvalg." }, { status: 400 });
    }
    let result: DocumentItem | null = null;
    let documentType: "qr" | "label" = "label";
    if (preference !== "label") {
      try {
        const body = await shipmondoRequest<unknown>(`/shipments/${shipmentId}/qr_code`, { method: "GET" });
        result = getDocument(body);
        if (result?.base64) documentType = "qr";
      } catch (err) {
        // Mange almindelige fragtprodukter har ikke QR; et afslag er forventeligt.
        if (preference === "qr") throw err;
      }
      if (!result?.base64 && preference === "qr") {
        return NextResponse.json({ error: "QR-kode er ikke tilgængelig for denne forsendelse." }, { status: 404 });
      }
    }
    if (!result?.base64) {
      const body = await shipmondoRequest<unknown>(`/shipments/${shipmentId}/labels`, { method: "GET" });
      result = getDocument(body);
      documentType = "label";
    }
    if (!result?.base64) {
      return NextResponse.json({ error: "Shipmondo returnerede ikke en label eller QR-kode." }, { status: 404 });
    }
    const fileType = (result.file_format ?? (documentType === "qr" ? "png" : "pdf")).toLowerCase();
    if (fileType !== "pdf" && fileType !== "png") {
      throw new Error("Ukendt format fra Shipmondo.");
    }
    const fileBytes = Buffer.from(result.base64, "base64");
    if (!fileBytes.length || fileBytes.length > 12 * 1024 * 1024) {
      throw new Error("Shipmondo returnerede et ugyldigt dokument.");
    }
    return new NextResponse(new Uint8Array(fileBytes), {
      headers: {
        "Content-Type": fileType === "pdf" ? "application/pdf" : "image/png",
        "Content-Disposition": `attachment; filename="equishopper-${carrier}-${documentType}.${fileType}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Kunne ikke hente fragtpapirer fra Shipmondo:", error);
    return NextResponse.json({ error: "Kunne ikke hente fragtpapirer lige nu. Prøv igen senere." }, { status: 502 });
  }
}
