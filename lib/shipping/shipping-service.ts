/**
 * Central shipping service for Equishopper.
 *
 * Current setup:
 * - DAO is the active shipping carrier.
 * - Shipmondo is used as the technical shipping integration layer.
 * - Equishopper keeps its own shipping prices in shipping_products.
 * - Live shipment creation is enabled when Shipmondo credentials exist.
 */

import { DaoProvider } from "./dao";
import type {
  ShipmentRequest,
  TrackingResponse,
} from "./types";

export const DEFAULT_SHIPPING_CARRIER = "dao" as const;

export type ShippingCarrier = typeof DEFAULT_SHIPPING_CARRIER;

export type ShippingAddress = {
  name?: string | null;
  addressLine1?: string | null;
  postalCode?: string | null;
  city?: string | null;
  countryCode?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type ShippingParcel = {
  weightGrams?: number | null;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
};

export type ShippingQuote = {
  carrier: ShippingCarrier;
  price: number;
  currency: "DKK";
  serviceCode: string | null;
  serviceName: string;
};

export type ShipmentResult = {
  carrier: ShippingCarrier;
  shipmentId: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  labelUrl: string | null;
};

export type TrackingResult = {
  carrier: ShippingCarrier;
  trackingNumber: string;
  status: string | null;
  description: string | null;
  lastEventAt: string | null;
};

export function isLiveShippingApiEnabled() {
  return Boolean(
    process.env.SHIPMONDO_API_USERNAME &&
      process.env.SHIPMONDO_API_KEY,
  );
}

export function getDefaultShippingCarrier(): ShippingCarrier {
  return DEFAULT_SHIPPING_CARRIER;
}

export function normalizeShippingCarrier(
  carrier?: string | null,
): ShippingCarrier {
  const normalized = carrier?.trim().toLowerCase();

  if (!normalized || normalized === "dao") {
    return DEFAULT_SHIPPING_CARRIER;
  }

  throw new Error(
    `Fragtfirmaet "${carrier}" understøttes ikke. Equishopper bruger DAO.`,
  );
}

/**
 * Equishopper bruger sine egne fragtpriser fra shipping_products.
 *
 * Derfor spørger vi ikke Shipmondo om en live pris her.
 */
export async function getShippingQuote(): Promise<ShippingQuote> {
  throw new Error(
    "Equishopper bruger fragtpriserne fra shipping_products. Live pristilbud fra Shipmondo bruges ikke.",
  );
}

/**
 * Opretter en DAO-forsendelse via Shipmondo.
 */
export async function createShipment(
  request: ShipmentRequest,
): Promise<ShipmentResult> {
  if (!isLiveShippingApiEnabled()) {
    throw new Error(
      "Shipmondo API er ikke konfigureret. Kontrollér SHIPMONDO_API_USERNAME og SHIPMONDO_API_KEY.",
    );
  }

  const carrier = normalizeShippingCarrier(
    request.provider,
  );

  if (carrier !== "dao") {
    throw new Error(
      `Fragtfirmaet "${carrier}" understøttes ikke.`,
    );
  }

  const provider = new DaoProvider();

  const result =
    await provider.createShipment(request);

  return {
    carrier: "dao",
    shipmentId: result.shipmentId || null,
    trackingNumber:
      result.trackingNumber || null,
    trackingUrl: result.trackingUrl || null,
    labelUrl: result.labelUrl || null,
  };
}

/**
 * Henter tracking på en DAO-forsendelse via Shipmondo.
 *
 * Selve DAO-adapterens tracking-endpoint implementeres,
 * når vi har den første rigtige shipment og kan verificere
 * Shipmondos tracking-response.
 */
export async function getShipmentTracking(
  trackingNumber: string,
): Promise<TrackingResult> {
  if (!trackingNumber.trim()) {
    throw new Error("Trackingnummer mangler.");
  }

  if (!isLiveShippingApiEnabled()) {
    throw new Error(
      "Shipmondo API er ikke konfigureret.",
    );
  }

  const provider = new DaoProvider();

  const result: TrackingResponse =
    await provider.getTracking(
      trackingNumber.trim(),
    );

  const latestEvent =
    result.events.length > 0
      ? result.events[
          result.events.length - 1
        ]
      : null;

  return {
    carrier: "dao",
    trackingNumber:
      result.trackingNumber,
    status: result.status ?? null,
    description:
      latestEvent?.description ?? null,
    lastEventAt:
      latestEvent?.timestamp ?? null,
  };
}