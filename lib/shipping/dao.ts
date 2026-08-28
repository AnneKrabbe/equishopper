import {
  ParcelShop,
  ShipmentRequest,
  ShipmentResponse,
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

  parcels?: Array<{
    id?: string | number;
    package_number?: string | null;
    tracking_code?: string | null;
    tracking_number?: string | null;
    labelless_code?: string | null;
  }>;
};

export class DaoProvider
  implements ShippingProviderAdapter
{
  /*
   * Shipmondos produktkode for:
   * daoSHOP / Shop-to-Shop.
   */
  private readonly productCode = "DAO_STS";

  async getParcelShops(
    zipCode: string,
    country = "DK",
  ): Promise<ParcelShop[]> {
    /*
     * Pakkeshopvalg håndteres nu via:
     * /api/shipping/dao/service-points
     *
     * Denne metode bruges derfor ikke
     * i checkout-flowet.
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
    validateShipmentRequest(request);

    /*
     * Shipmondo accepterer maksimalt
     * 40 tegn i referencefeltet.
     */
    const reference = (
      request.reference?.trim() ||
      `Equishopper ${request.orderId}`
    ).slice(0, 40);

    const parcelShopId =
      request.parcelShopId?.trim() || "";

    const payload = {
      /*
       * Equishopper bruger sin egen
       * DAO-aftale i Shipmondo.
       */
      own_agreement: true,

      /*
       * Shipmondo kræver stadig et
       * label-format i shipment-requestet.
       *
       * Det forhindrer ikke, at vi bruger
       * DAO's labelless/E-LABEL-kode.
       */
      label_format: "a4_pdf",

      /*
       * daoSHOP / Shop-to-Shop.
       */
      product_code: this.productCode,

      /*
       * DAO kræver mindst én
       * adviseringstype.
       *
       * Vi bruger modtagerens e-mail.
       */
      service_codes: "EMAIL_NT",

      reference,

      /*
       * Hvis køberen har valgt en bestemt
       * DAO-pakkeshop, sender vi dens
       * Shipmondo service_point_id.
       *
       * Ellers kan Shipmondo vælge
       * automatisk som fallback.
       */
      automatic_select_service_point:
        !parcelShopId,

      ...(parcelShopId
        ? {
            service_point_id:
              parcelShopId,
          }
        : {}),

      /*
       * Afsender og modtager.
       */
      parties: [
        {
          type: "sender",

          name:
            request.sender.company?.trim() ||
            request.sender.name.trim(),

          attention:
            request.sender.company?.trim()
              ? request.sender.name.trim()
              : undefined,

          address1:
            request.sender.address.trim(),

          postal_code:
            request.sender.zipCode.trim(),

          city:
            request.sender.city.trim(),

          country_code:
            request.sender.country
              .trim()
              .toUpperCase(),

          email:
            request.sender.email.trim(),

          phone:
            request.sender.phone.trim(),
        },

        {
          type: "receiver",

          name:
            request.receiver.company?.trim() ||
            request.receiver.name.trim(),

          attention:
            request.receiver.company?.trim()
              ? request.receiver.name.trim()
              : undefined,

          address1:
            request.receiver.address.trim(),

          postal_code:
            request.receiver.zipCode.trim(),

          city:
            request.receiver.city.trim(),

          country_code:
            request.receiver.country
              .trim()
              .toUpperCase(),

          email:
            request.receiver.email.trim(),

          phone:
            request.receiver.phone.trim(),
        },
      ],

      /*
       * Shipmondo forventer pakkens
       * vægt i gram.
       */
      parcels: [
        {
          weight: Math.round(request.weight),
        },
      ],
    };

    /*
     * Opret forsendelsen hos Shipmondo.
     */
    const result =
      await shipmondoRequest<ShipmondoShipmentResponse>(
        "/shipments",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );

    /*
     * Shipmondos shipment-id.
     */
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

    /*
     * DAO E-LABEL / labelless-kode.
     *
     * Denne kode kan sælgeren skrive
     * direkte på pakken, så der ikke
     * behøves en printer.
     */
    const labellessCode =
      result.parcels?.[0]?.labelless_code ??
      "";

    /*
     * Vi prioriterer DAO's labelless-kode.
     *
     * Hvis Shipmondo ikke returnerer den,
     * falder vi tilbage til de øvrige
     * tracking/package-felter.
     */
    const trackingNumber =
      labellessCode ||
      result.parcels?.[0]?.tracking_code ||
      result.parcels?.[0]?.tracking_number ||
      result.parcels?.[0]?.package_number ||
      result.tracking_code ||
      result.tracking_number ||
      "";

    /*
     * Vi beholder label-URL som fallback.
     * Equishopper skal dog primært bruge
     * labelless-koden for DAO.
     */
    const labelUrl =
      result.label_url ??
      result.labels?.[0]?.url ??
      "";

    /*
     * Midlertidig log til test.
     *
     * Her kan vi kontrollere, at den
     * valgte pakkeshop faktisk sendes med.
     */
    console.log("[Shipmondo/DAO] Shipment oprettet", {
      shipmentId,
      servicePointId:
        parcelShopId || null,
      labellessCode,
      trackingNumber,
      hasLabelUrl: Boolean(labelUrl),
    });

    return {
      shipmentId,
      provider: "dao",
      trackingNumber,
      trackingUrl:
        result.tracking_url ?? "",
      labelUrl,
      status:
        labellessCode || labelUrl
          ? "label_created"
          : "created",
    };
  }

  async getTracking(
    trackingNumber: string,
  ): Promise<TrackingResponse> {
    if (!trackingNumber.trim()) {
      throw new Error(
        "Trackingnummer mangler.",
      );
    }

    /*
     * Tracking-endpointet kobler vi
     * på separat senere.
     */
    throw new Error(
      "Shipmondo tracking er endnu ikke koblet på.",
    );
  }

  async cancelShipment(
    shipmentId: string,
  ): Promise<boolean> {
    if (!shipmentId.trim()) {
      throw new Error(
        "Shipment-id mangler.",
      );
    }

    /*
     * Annullering kobles på separat.
     */
    throw new Error(
      "Shipmondo-annullering er endnu ikke koblet på.",
    );
  }
}

function validateShipmentRequest(
  request: ShipmentRequest,
) {
  if (!request.sender.name.trim()) {
    throw new Error(
      "Afsendernavn mangler.",
    );
  }

  if (!request.receiver.name.trim()) {
    throw new Error(
      "Modtagernavn mangler.",
    );
  }

  if (!request.sender.address.trim()) {
    throw new Error(
      "Afsenderadresse mangler.",
    );
  }

  if (!request.receiver.address.trim()) {
    throw new Error(
      "Modtageradresse mangler.",
    );
  }

  if (!request.sender.zipCode.trim()) {
    throw new Error(
      "Afsenders postnummer mangler.",
    );
  }

  if (!request.receiver.zipCode.trim()) {
    throw new Error(
      "Modtagers postnummer mangler.",
    );
  }

  if (!request.sender.city.trim()) {
    throw new Error(
      "Afsenders by mangler.",
    );
  }

  if (!request.receiver.city.trim()) {
    throw new Error(
      "Modtagers by mangler.",
    );
  }

  if (!request.sender.email.trim()) {
    throw new Error(
      "Afsenders e-mail mangler.",
    );
  }

  if (!request.receiver.email.trim()) {
    throw new Error(
      "Modtagerens e-mail mangler.",
    );
  }

  if (
    !Number.isFinite(request.weight) ||
    request.weight <= 0
  ) {
    throw new Error(
      "Pakkens vægt er ugyldig.",
    );
  }
}
