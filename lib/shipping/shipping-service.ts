/**
 * Central shipping service for Equishopper.
 *
 * Current setup:
 * - DAO is the only planned shipping carrier.
 * - DAO API integration is not connected yet.
 * - No Bring integration is used.
 */

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
  return false;
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

export async function getShippingQuote(): Promise<ShippingQuote> {
  throw new Error(
    "DAO's live fragt-API er endnu ikke koblet på. Brug den eksisterende fragtpris fra Equishopper.",
  );
}

export async function createShipment(): Promise<ShipmentResult> {
  throw new Error(
    "DAO's live forsendelses-API er endnu ikke koblet på.",
  );
}

export async function getShipmentTracking(
  trackingNumber: string,
): Promise<TrackingResult> {
  if (!trackingNumber.trim()) {
    throw new Error("Trackingnummer mangler.");
  }

  throw new Error(
    "DAO's live tracking-API er endnu ikke koblet på.",
  );
}