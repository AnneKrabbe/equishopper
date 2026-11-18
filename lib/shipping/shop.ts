/**
 * Kun nye pakkeshopforsendelser: GLS ShopDelivery og PostNord Service Point.
 * DAO bruger fortsat DaoProvider uden ændringer.
 * QR-kode kan først returneres, hvis Shipmondo rent faktisk leverer en
 * transportørgodkendt indleveringskode til dette fragtprodukt.
 */
import { shipmondoRequest } from "./shipmondo";
import type { ShipmentRequest, ShipmentResponse } from "./types";

type ShopCarrier = "gls" | "postnord";

const PRODUCTS: Record<ShopCarrier, string> = {
  gls: "GLSDK_SD",
  postnord: "PDK_MC",
};

type ShipmondoShipment = {
  id?: number | string;
  shipment_id?: number | string;
  tracking_code?: string | null;
  tracking_number?: string | null;
  pkg_no?: string | null;
  tracking_url?: string | null;
  label_url?: string | null;
  labels?: Array<{ url?: string | null }>;
  parcels?: Array<{
    tracking_code?: string | null;
    tracking_number?: string | null;
    package_number?: string | null;
    pkg_no?: string | null;
  }>;
};

export class ShopProvider {
  constructor(private readonly carrier: ShopCarrier) {}

  async createShipment(request: ShipmentRequest): Promise<ShipmentResponse> {
    if (request.provider !== this.carrier) {
      throw new Error("Fragtfirmaet stemmer ikke overens med forsendelsen.");
    }
    const servicePointId = request.parcelShopId?.trim();
    if (!servicePointId) throw new Error("Køberens pakkeshop mangler.");
    if (!Number.isFinite(request.weight) || request.weight <= 0) {
      throw new Error("Pakkens vægt er ugyldig.");
    }

    const sender = request.sender;
    const receiver = request.receiver;
    const required = [sender.name, sender.address, sender.zipCode, sender.city, sender.email,
      receiver.name, receiver.address, receiver.zipCode, receiver.city, receiver.email];
    if (required.some((value) => !value?.trim())) {
      throw new Error("Afsender eller modtager mangler adresseoplysninger.");
    }

    const payload = {
      // GLS og PostNord købes på Shipmondos aftaler, ikke DAO's egen.
      own_agreement: false,
      label_format: "a4_pdf",
      product_code: PRODUCTS[this.carrier],
      service_codes: "EMAIL_NT",
      reference: (request.reference?.trim() || `Equishopper ${request.orderId}`).slice(0, 40),
      automatic_select_service_point: false,
      service_point_id: servicePointId,
      parties: [
        {
          type: "sender",
          name: sender.company?.trim() || sender.name.trim(),
          ...(sender.company?.trim() ? { attention: sender.name.trim() } : {}),
          address1: sender.address.trim(),
          postal_code: sender.zipCode.trim(),
          city: sender.city.trim(),
          country_code: sender.country.trim().toUpperCase(),
          email: sender.email.trim(),
          phone: sender.phone?.trim() || "",
        },
        {
          type: "receiver",
          name: receiver.company?.trim() || receiver.name.trim(),
          ...(receiver.company?.trim() ? { attention: receiver.name.trim() } : {}),
          address1: receiver.address.trim(),
          postal_code: receiver.zipCode.trim(),
          city: receiver.city.trim(),
          country_code: receiver.country.trim().toUpperCase(),
          email: receiver.email.trim(),
          phone: receiver.phone?.trim() || "",
          ...(receiver.phone?.trim() ? { mobile: receiver.phone.trim() } : {}),
        },
      ],
      parcels: [{ weight: Math.round(request.weight) }],
    };

    const result = await shipmondoRequest<ShipmondoShipment>("/shipments", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const shipmentId = String(result.id ?? result.shipment_id ?? "").trim();
    if (!shipmentId) {
      throw new Error("Forsendelsen kan være oprettet i Shipmondo, men mangler shipment-id. Kontrollér i Shipmondo før nyt forsøg.");
    }
    const trackingNumber = String(
      result.parcels?.[0]?.tracking_code ??
      result.parcels?.[0]?.tracking_number ??
      result.parcels?.[0]?.package_number ??
      result.parcels?.[0]?.pkg_no ??
      result.tracking_code ??
      result.tracking_number ??
      result.pkg_no ??
      "",
    ).trim();
    const labelUrl = result.label_url ?? result.labels?.[0]?.url ?? "";

    return {
      shipmentId,
      provider: this.carrier,
      trackingNumber,
      trackingUrl: result.tracking_url || (trackingNumber
        ? `https://track.shipmondo.com/${this.carrier === "gls" ? "gls" : "pdk"}/${encodeURIComponent(trackingNumber)}`
        : ""),
      labelUrl: /^https:\/\//i.test(labelUrl) ? labelUrl : "",
      status: labelUrl ? "label_created" : "created",
    };
  }
}
