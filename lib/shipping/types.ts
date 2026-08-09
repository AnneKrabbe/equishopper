// lib/shipping/types.ts

export type ShippingProvider = "dao";

export interface ParcelShop {
  id: string;
  name: string;
  address: string;
  zipCode: string;
  city: string;
  country: string;

  latitude?: number;
  longitude?: number;

  distance?: number;
}

export interface Sender {
  name: string;
  company?: string;

  address: string;
  zipCode: string;
  city: string;
  country: string;

  email: string;
  phone: string;
}

export interface Receiver {
  name: string;
  company?: string;

  address: string;
  zipCode: string;
  city: string;
  country: string;

  email: string;
  phone: string;
}

export interface ShipmentRequest {
  provider: ShippingProvider;

  orderId: string;

  sender: Sender;
  receiver: Receiver;

  weight: number;

  parcelShopId?: string;

  reference?: string;
}

export interface ShipmentResponse {
  shipmentId: string;

  provider: ShippingProvider;

  trackingNumber: string;

  trackingUrl: string;

  labelUrl: string;

  status: ShipmentStatus;
}

export type ShipmentStatus =
  | "created"
  | "label_created"
  | "handed_in"
  | "in_transit"
  | "ready_for_pickup"
  | "delivered"
  | "cancelled"
  | "error";

export interface TrackingEvent {
  status: ShipmentStatus;

  description: string;

  timestamp: string;

  location?: string;
}

export interface TrackingResponse {
  shipmentId: string;

  trackingNumber: string;

  provider: ShippingProvider;

  status: ShipmentStatus;

  events: TrackingEvent[];
}

export interface ShippingProviderAdapter {
  getParcelShops(
    zipCode: string,
    country?: string
  ): Promise<ParcelShop[]>;

  createShipment(
    request: ShipmentRequest
  ): Promise<ShipmentResponse>;

  getTracking(
    trackingNumber: string
  ): Promise<TrackingResponse>;

  cancelShipment(
    shipmentId: string
  ): Promise<boolean>;
}