import { Text } from "@react-email/components";

import { EmailLayout } from "../components/email-layout";
import { ListingCard } from "../components/listing-card";

export type OfferRejectedEmailProps = {
  recipientName?: string | null;
  sellerName: string;
  listingTitle: string;
  listingImageUrl?: string | null;
  listingPrice: string;
  offerAmount: string;
  browseUrl: string;
};

export function OfferRejectedEmail({
  recipientName,
  sellerName,
  listingTitle,
  listingImageUrl,
  listingPrice,
  offerAmount,
  browseUrl,
}: OfferRejectedEmailProps) {
  return (
    <EmailLayout
      preview={`Dit bud på ${listingTitle} blev ikke accepteret`}
      title="Dit bud blev ikke accepteret"
      badge="Bud afslået"
      buttonText="Find flere annoncer"
      buttonUrl={browseUrl}
    >
      <Text style={paragraph}>
        Hej{recipientName ? ` ${recipientName}` : ""}
      </Text>

      <Text style={paragraph}>
        {sellerName} har valgt ikke at acceptere dit bud på varen nedenfor.
      </Text>

      <ListingCard
        title={listingTitle}
        imageUrl={listingImageUrl}
        price={listingPrice}
        subtitle="Annoncens pris"
      />

      <Text style={paragraph}>
        Dit bud: <strong>{offerAmount}</strong>
      </Text>

      <Text style={hint}>
        Du kan fortsat udforske andre annoncer på Equishopper.
      </Text>
    </EmailLayout>
  );
}

OfferRejectedEmail.PreviewProps = {
  recipientName: "Maria",
  sellerName: "Anne",
  listingTitle: 'Kentaur Ithaka dressursadel 17,5"',
  listingImageUrl:
    "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=1200&q=80",
  listingPrice: "8.500 kr.",
  offerAmount: "7.500 kr.",
  browseUrl: "https://equishopper.dk",
} satisfies OfferRejectedEmailProps;

export default OfferRejectedEmail;

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
