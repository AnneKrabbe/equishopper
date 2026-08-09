import { Text } from "@react-email/components";

import { EmailLayout } from "../components/email-layout";
import { ListingCard } from "../components/listing-card";
import { MessageCard } from "../components/message-card";

export type NewMessageEmailProps = {
  recipientName?: string | null;
  senderName: string;
  listingTitle: string;
  listingImageUrl?: string | null;
  message: string;
  conversationUrl: string;
};

export function NewMessageEmail({
  recipientName,
  senderName,
  listingTitle,
  listingImageUrl,
  message,
  conversationUrl,
}: NewMessageEmailProps) {
  return (
    <EmailLayout
      preview={`${senderName} har sendt dig en besked`}
      title="Du har fået en ny besked"
      badge="Ny besked"
      buttonText="Åbn samtalen"
      buttonUrl={conversationUrl}
    >
      <Text style={paragraph}>
        Hej{recipientName ? ` ${recipientName}` : ""}
      </Text>

      <Text style={paragraph}>
        {senderName} har sendt dig en ny besked om annoncen nedenfor.
      </Text>

      <ListingCard
        title={listingTitle}
        imageUrl={listingImageUrl}
        subtitle="Annonce"
      />

      <MessageCard
        label={`Besked fra ${senderName}`}
        message={message}
      />

      <Text style={paragraph}>
        Svar direkte i samtalen på Equishopper for at fortsætte dialogen.
      </Text>

      <Text style={hint}>
        Af hensyn til din sikkerhed anbefaler vi, at al kommunikation foregår via
        Equishoppers beskedsystem.
      </Text>
    </EmailLayout>
  );
}

NewMessageEmail.PreviewProps = {
  recipientName: "Anne",
  senderName: "Maria Nielsen",
  listingTitle: 'Kentaur Ithaka dressursadel 17,5"',
  listingImageUrl:
    "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=1200&q=80",
  message: `Hej 😊

Jeg ville bare høre, om sadlen stadig er til salg?

Hvis ja, vil jeg meget gerne komme og se den i denne uge.

Venlig hilsen
Maria`,
  conversationUrl: "https://equishopper.dk/messages/123",
} satisfies NewMessageEmailProps;

export default NewMessageEmail;

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