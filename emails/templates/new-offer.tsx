import { Text } from "@react-email/components";

import { EmailLayout } from "../components/email-layout";
import { InfoCard } from "../components/info-card";
import { ListingCard } from "../components/listing-card";
import { MessageCard } from "../components/message-card";

export type NewOfferEmailProps = {
  sellerName?: string | null;
  buyerName: string;
  listingTitle: string;
  listingImageUrl?: string | null;
  listingPrice: string;
  offerAmount: string;
  offerMessage?: string | null;
  offerUrl: string;
};

export function NewOfferEmail({
  sellerName,
  buyerName,
  listingTitle,
  listingImageUrl,
  listingPrice,
  offerAmount,
  offerMessage,
  offerUrl,
}: NewOfferEmailProps) {
  return (
    <EmailLayout
      preview={`${buyerName} har budt ${offerAmount} på ${listingTitle}`}
      title="Du har fået et nyt bud"
      badge="Nyt bud"
      buttonText="Se og besvar buddet"
      buttonUrl={offerUrl}
    >
      <Text style={paragraph}>
        Hej{sellerName ? ` ${sellerName}` : ""}
      </Text>

      <Text style={paragraph}>
        {buyerName} har sendt et bud på din annonce.
      </Text>

      <ListingCard
        title={listingTitle}
        imageUrl={listingImageUrl}
        price={listingPrice}
        subtitle="Din salgspris"
      />

      <InfoCard
        items={[
          {
            label: "Bud fra",
            value: buyerName,
          },
          {
            label: "Bud",
            value: offerAmount,
          },
        ]}
      />

      {offerMessage ? (
        <MessageCard
          label={`Besked fra ${buyerName}`}
          message={offerMessage}
        />
      ) : null}

      <Text style={paragraph}>
        Du kan nu acceptere buddet, sende et modbud eller afslå det direkte på
        Equishopper.
      </Text>

      <Text style={hint}>
        Alle beskeder og forhandlinger foregår sikkert via Equishopper, så både
        køber og sælger har det fulde overblik over handlen.
      </Text>
    </EmailLayout>
  );
}

NewOfferEmail.PreviewProps = {
  sellerName: "Anne",
  buyerName: "Maria Nielsen",
  listingTitle: 'Kentaur Ithaka dressursadel 17,5"',
  listingImageUrl:
    "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=1200&q=80",
  listingPrice: "8.500 kr.",
  offerAmount: "7.500 kr.",
  offerMessage: `Hej 😊

Jeg er meget interesseret i sadlen.

Jeg kan hente den allerede i weekenden, hvis du kan acceptere 7.500 kr.

Venlig hilsen
Maria`,
  offerUrl: "https://equishopper.dk/offers/123",
} satisfies NewOfferEmailProps;

export default NewOfferEmail;

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