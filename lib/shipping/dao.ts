// lib/shipping/dao.ts

import {
  ParcelShop,
  ShipmentRequest,
  ShipmentResponse,
  ShipmentStatus,
  ShippingProviderAdapter,
  TrackingResponse,
} from "./types";

export class DaoProvider implements ShippingProviderAdapter {
  private readonly apiKey = process.env.DAO_API_KEY!;
  private readonly customerId = process.env.DAO_CUSTOMER_ID!;
  private readonly baseUrl =
    process.env.DAO_API_URL ?? "https://api.dao.as";

  private get headers() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  async getParcelShops(
    zipCode: string,
    country = "DK"
  ): Promise<ParcelShop[]> {
    // TODO:
    // Implement DAO Parcelshop API

    console.log("[DAO] Parcelshops", {
      zipCode,
      country,
    });

    return [];
  }

  async createShipment(
    request: ShipmentRequest
  ): Promise<ShipmentResponse> {
    // TODO:
    // Implement DAO Shipment API

    console.log("[DAO] Create shipment", request);

    return {
      shipmentId: crypto.randomUUID(),
      provider: "dao",
      trackingNumber: "",
      trackingUrl: "",
      labelUrl: "",
      status: "created",
    };
  }

  async getTracking(
    trackingNumber: string
  ): Promise<TrackingResponse> {
    // TODO:
    // Implement DAO Tracking API

    console.log("[DAO] Tracking", trackingNumber);

    return {
      shipmentId: "",
      trackingNumber,
      provider: "dao",
      status: "created",
      events: [],
    };
  }

  async cancelShipment(
    shipmentId: string
  ): Promise<boolean> {
    // TODO:
    // Implement DAO Cancel Shipment API

    console.log("[DAO] Cancel shipment", shipmentId);

    return true;
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