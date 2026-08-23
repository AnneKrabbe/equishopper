// lib/shipping/dao.ts

import {
  ParcelShop,
  ShipmentRequest,
  ShipmentResponse,
  ShipmentStatus,
  ShippingProviderAdapter,
  TrackingResponse,
} from "./types";

import { shipmondoRequest } from "./shipmondo";

type ShipmondoShipmentResponse = {
  id?: string | number;
  shipment_id?: string | number;

  tracking_code?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;

  label_url?: string | null;
  labels?: Array<{
    url?: string | null;
  }>;
};

export class DaoProvider implements ShippingProviderAdapter {
  private readonly productCode = "DAO_STS";

  async getParcelShops(
    zipCode: string,
    country = "DK",
  ): Promise<ParcelShop[]> {
    /*
     * Vi implementerer pakkeshopvalg separat.
     *
     * DAO_STS kan bruges sammen med automatisk valg
     * af service point hos Shipmondo, så dette er ikke
     * nødvendigt for vores første fungerende shipment-flow.
     */
    console.log("[Shipmondo/DAO] Parcelshops", {
      zipCode,
      country,
    });

    return [];
  }

  async createShipment(
    request: ShipmentRequest,
  ): Promise<ShipmentResponse> {
    if (!request.sender.name.trim()) {
      throw new Error("Afsendernavn mangler.");
    }

    if (!request.receiver.name.trim()) {
      throw new Error("Modtagernavn mangler.");
    }

    if (!request.sender.address.trim()) {
      throw new Error("Afsenderadresse mangler.");
    }

    if (!request.receiver.address.trim()) {
      throw new Error("Modtageradresse mangler.");
    }

    if (!request.sender.zipCode.trim()) {
      throw new Error("Afsenders postnummer mangler.");
    }

    if (!request.receiver.zipCode.trim()) {
      throw new Error("Modtagers postnummer mangler.");
    }

    if (!Number.isFinite(request.weight) || request.weight <= 0) {
      throw new Error("Pakkens vægt er ugyldig.");
    }

    const payload = {
      own_agreement: true,

      label_format: "a4_pdf",

      product_code: this.productCode,

      /*
       * Vi kan senere slå EMAIL_NT / SMS_NT til.
       * Første test holdes så simpel som muligt.
       */
      service_codes: "",

      reference:
        request.reference?.trim() ||
        `Equishopper ${request.orderId}`,

      /*
       * Shipmondo kan automatisk vælge pakkeshop
       * på daoSHOP-produktet.
       */
      automatic_select_service_point:
        !request.parcelShopId,

      /*
       * Hvis vi senere lader køber vælge en bestemt
       * pakkeshop, tilføjer vi service point-id her
       * efter Shipmondos dokumenterede feltformat.
       */

      parties: [
        {
          type: "sender",

          name:
            request.sender.company?.trim() ||
            request.sender.name.trim(),

          attention:
            request.sender.company
              ? request.sender.name.trim()
              : undefined,

          address1: request.sender.address.trim(),
          postal_code: request.sender.zipCode.trim(),
          city: request.sender.city.trim(),
          country_code:
            request.sender.country.trim().toUpperCase(),

          email: request.sender.email.trim(),
          phone: request.sender.phone.trim(),
        },

        {
          type: "receiver",

          name:
            request.receiver.company?.trim() ||
            request.receiver.name.trim(),

          attention:
            request.receiver.company
              ? request.receiver.name.trim()
              : undefined,

          address1: request.receiver.address.trim(),
          postal_code: request.receiver.zipCode.trim(),
          city: request.receiver.city.trim(),
          country_code:
            request.receiver.country.trim().toUpperCase(),

          email: request.receiver.email.trim(),
          phone: request.receiver.phone.trim(),
        },
      ],

      parcels: [
        {
          /*
           * Shipmondos eksempel bruger vægt i gram.
           */
          weight: Math.round(request.weight),
        },
      ],
    };

    const result =
      await shipmondoRequest<ShipmondoShipmentResponse>(
        "/shipments",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );

    const shipmentId = String(
      result.id ??
        result.shipment_id ??
        "",
    );

    if (!shipmentId) {
      console.error(
        "[Shipmondo/DAO] Uventet shipment-response:",
        result,
      );

      throw new Error(
        "Shipmondo oprettede forsendelsen, men returnerede ikke et shipment-id.",
      );
    }

    const trackingNumber =
      result.tracking_code ??
      result.tracking_number ??
      "";

    const labelUrl =
      result.label_url ??
      result.labels?.[0]?.url ??
      "";

    return {
      shipmentId,
      provider: "dao",
      trackingNumber,
      trackingUrl: result.tracking_url ?? "",
      labelUrl,
      status: labelUrl
        ? "label_created"
        : "created",
    };
  }

  async getTracking(
    trackingNumber: string,
  ): Promise<TrackingResponse> {
    if (!trackingNumber.trim()) {
      throw new Error("Trackingnummer mangler.");
    }

    /*
     * Tracking-endpointet kobler vi på, når den
     * første shipment er oprettet, så vi kan se
     * Shipmondos faktiske response-format for DAO.
     */
    throw new Error(
      "Shipmondo tracking er endnu ikke koblet på.",
    );
  }

  async cancelShipment(
    shipmentId: string,
  ): Promise<boolean> {
    if (!shipmentId.trim()) {
      throw new Error("Shipment-id mangler.");
    }

    /*
     * Vi kobler annullering på efter den første
     * booking-test. Ingen fake success-responses.
     */
    throw new Error(
      "Shipmondo-annullering er endnu ikke koblet på.",
    );
  }

  private mapStatus(status: string): ShipmentStatus {
    switch (status.toLowerCase()) {
      case "created":
        return "created";

      case "label_created":
        return "label_created";

      case "handed_in":
        return "handed_in";

      case "in_transit":
        return "in_transit";

      case "ready_for_pickup":
        return "ready_for_pickup";

      case "delivered":
        return "delivered";

      case "cancelled":
        return "cancelled";

      default:
        return "error";
    }
  }
}