import { Text } from "@react-email/components";

import { EmailLayout } from "../components/email-layout";
import { InfoCard } from "../components/info-card";
import { ListingCard } from "../components/listing-card";

export type ItemShippedEmailProps = {
  buyerName?: string | null;
  sellerName: string;
  listingTitle: string;
  listingImageUrl?: string | null;
  totalPrice: string;
  carrierName?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  orderUrl: string;
};

export function ItemShippedEmail({
  buyerName,
  sellerName,
  listingTitle,
  listingImageUrl,
  totalPrice,
  carrierName,
  trackingNumber,
  trackingUrl,
  orderUrl,
}: ItemShippedEmailProps) {
  const buttonUrl = trackingUrl ?? orderUrl;
  const buttonText = trackingUrl ? "Følg din pakke" : "Se din ordre";

  return (
    <EmailLayout
      preview={`${sellerName} har sendt din vare`}
      title="Din vare er sendt"
      badge="Afsendt"
      buttonText={buttonText}
      buttonUrl={buttonUrl}
    >
      <Text style={paragraph}>
        Hej{buyerName ? ` ${buyerName}` : ""}
      </Text>

      <Text style={paragraph}>
        Gode nyheder – {sellerName} har sendt din vare.
      </Text>

      <ListingCard
        title={listingTitle}
        imageUrl={listingImageUrl}
        price={totalPrice}
        subtitle="Ordrebeløb"
      />

      {carrierName || trackingNumber ? (
        <InfoCard
          items={[
            ...(carrierName
              ? [
                  {
                    label: "Fragtfirma",
                    value: carrierName,
                  },
                ]
              : []),
            ...(trackingNumber
              ? [
                  {
                    label: "Track & trace",
                    value: trackingNumber,
                  },
                ]
              : []),
          ]}
        />
      ) : null}

      <Text style={paragraph}>
        Leveringstiden afhænger af det valgte fragtfirma. Du kan følge din ordre
        og se de nyeste oplysninger direkte på Equishopper.
      </Text>

      <Text style={hint}>
        Når du modtager pakken, anbefaler vi, at du gennemgår varen med det
        samme. Hvis der er spørgsmål eller problemer, kan du kontakte sælgeren
        direkte via Equishopper.
      </Text>
    </EmailLayout>
  );
}

ItemShippedEmail.PreviewProps = {
  buyerName: "Maria",
  sellerName: "Anne",
  listingTitle: 'Kentaur Ithaka dressursadel 17,5"',
  listingImageUrl:
    "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=1200&q=80",
  totalPrice: "8.079 kr.",
  carrierName: "PostNord",
  trackingNumber: "00370730200012345678",
  trackingUrl: "https://equishopper.dk/orders/123/tracking",
  orderUrl: "https://equishopper.dk/orders/123",
} satisfies ItemShippedEmailProps;

export default ItemShippedEmail;

const paragraph = {
  color: "#465149",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 14px",
};

const hint = {
  color: "#7a7569",
  fontSize: "13px",
  lineHeight: "21px",
  margin: "20px 0 0",
};