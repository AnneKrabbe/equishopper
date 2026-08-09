import { Text } from "@react-email/components";

import { EmailLayout } from "../components/email-layout";
import { InfoCard } from "../components/info-card";
import { ListingCard } from "../components/listing-card";
import { MessageCard } from "../components/message-card";

export type CounterOfferEmailProps = {
  recipientName?: string | null;
  senderName: string;
  listingTitle: string;
  listingImageUrl?: string | null;
  listingPrice: string;
  originalOfferAmount: string;
  counterOfferAmount: string;
  counterOfferMessage?: string | null;
  offerUrl: string;
};

export function CounterOfferEmail({
  recipientName,
  senderName,
  listingTitle,
  listingImageUrl,
  listingPrice,
  originalOfferAmount,
  counterOfferAmount,
  counterOfferMessage,
  offerUrl,
}: CounterOfferEmailProps) {
  return (
    <EmailLayout
      preview={`${senderName} har sendt dig et modbud på ${counterOfferAmount}`}
      title="Du har fået et modbud"
      badge="Modbud"
      buttonText="Se og besvar modbuddet"
      buttonUrl={offerUrl}
    >
      <Text style={paragraph}>
        Hej{recipientName ? ` ${recipientName}` : ""}
      </Text>

      <Text style={paragraph}>
        {senderName} har sendt dig et modbud på varen nedenfor.
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
            label: "Dit oprindelige bud",
            value: originalOfferAmount,
          },
          {
            label: "Modbud fra sælger",
            value: counterOfferAmount,
          },
        ]}
      />

      {counterOfferMessage ? (
        <MessageCard
          label={`Besked fra ${senderName}`}
          message={counterOfferMessage}
        />
      ) : null}

      <Text style={hint}>
        Du kan acceptere modbuddet, afslå det eller fortsætte dialogen direkte
        på Equishopper.
      </Text>

      <Text style={notice}>
        Varen er først reserveret, når begge parter er enige, og handlen er
        gennemført via Equishopper.
      </Text>
    </EmailLayout>
  );
}

CounterOfferEmail.PreviewProps = {
  recipientName: "Maria",
  senderName: "Anne",
  listingTitle: 'Kentaur Ithaka dressursadel 17,5"',
  listingImageUrl:
    "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=1200&q=80",
  listingPrice: "8.500 kr.",
  originalOfferAmount: "7.500 kr.",
  counterOfferAmount: "8.000 kr.",
  counterOfferMessage:
    "Tak for dit bud. Jeg kan tilbyde sadlen til 8.000 kr., hvis du fortsat er interesseret.",
  offerUrl: "https://equishopper.dk/offers/123",
} satisfies CounterOfferEmailProps;

export default CounterOfferEmail;

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