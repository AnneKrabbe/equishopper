import { Text } from "@react-email/components";

import { EmailLayout } from "../components/email-layout";
import { InfoCard } from "../components/info-card";
import { ListingCard } from "../components/listing-card";
import { MessageCard } from "../components/message-card";

export type OfferAcceptedEmailProps = {
  buyerName?: string | null;
  sellerName: string;
  listingTitle: string;
  listingImageUrl?: string | null;
  listingPrice: string;
  acceptedAmount: string;
  sellerMessage?: string | null;
  checkoutUrl: string;
};

export function OfferAcceptedEmail({
  buyerName,
  sellerName,
  listingTitle,
  listingImageUrl,
  listingPrice,
  acceptedAmount,
  sellerMessage,
  checkoutUrl,
}: OfferAcceptedEmailProps) {
  return (
    <EmailLayout
      preview={`${sellerName} har accepteret dit bud på ${acceptedAmount}`}
      title="Dit bud er blevet accepteret"
      badge="Bud accepteret"
      buttonText="Gå til betaling"
      buttonUrl={checkoutUrl}
    >
      <Text style={paragraph}>
        Hej{buyerName ? ` ${buyerName}` : ""}
      </Text>

      <Text style={paragraph}>
        Gode nyheder — {sellerName} har accepteret dit bud på varen nedenfor.
      </Text>

      <ListingCard
        title={listingTitle}
        imageUrl={listingImageUrl}
        price={listingPrice}
        subtitle="Annoncens pris"
      />

      <InfoCard
        items={[
          {
            label: "Sælger",
            value: sellerName,
          },
          {
            label: "Accepteret pris",
            value: acceptedAmount,
          },
        ]}
      />

      {sellerMessage ? (
        <MessageCard
          label={`Besked fra ${sellerName}`}
          message={sellerMessage}
        />
      ) : null}

      <Text style={hint}>
        Gennemfør betalingen på Equishopper for at sikre varen og færdiggøre
        handlen.
      </Text>

      <Text style={notice}>
        Varen er først din, når betalingen er gennemført. Betal aldrig uden for
        Equishopper, og del ikke dine betalingsoplysninger direkte med sælger.
      </Text>
    </EmailLayout>
  );
}

OfferAcceptedEmail.PreviewProps = {
  buyerName: "Maria",
  sellerName: "Anne",
  listingTitle: 'Kentaur Ithaka dressursadel 17,5"',
  listingImageUrl:
    "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=1200&q=80",
  listingPrice: "8.500 kr.",
  acceptedAmount: "7.500 kr.",
  sellerMessage:
    "Tak for dit bud. Jeg har accepteret det og glæder mig til at få handlen på plads.",
  checkoutUrl: "https://equishopper.dk/checkout/123",
} satisfies OfferAcceptedEmailProps;

export default OfferAcceptedEmail;

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

const notice = {
  borderTop: "1px solid #ece6dc",
  color: "#7a7569",
  fontSize: "12px",
  lineHeight: "19px",
  margin: "22px 0 0",
  paddingTop: "16px",
};