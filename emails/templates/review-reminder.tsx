import { Text } from "@react-email/components";

import { EmailLayout } from "../components/email-layout";
import { ListingCard } from "../components/listing-card";

export type ReviewReminderEmailProps = {
  recipientName?: string | null;
  otherPartyName: string;
  listingTitle: string;
  listingImageUrl?: string | null;
  transactionRole: "buyer" | "seller";
  reviewUrl: string;
};

export function ReviewReminderEmail({
  recipientName,
  otherPartyName,
  listingTitle,
  listingImageUrl,
  transactionRole,
  reviewUrl,
}: ReviewReminderEmailProps) {
  const roleText =
    transactionRole === "buyer"
      ? `dit køb hos ${otherPartyName}`
      : `dit salg til ${otherPartyName}`;

  return (
    <EmailLayout
      preview={`Hvordan gik ${roleText}?`}
      title="Hvordan gik handlen?"
      badge="Del din oplevelse"
      buttonText="Skriv en anmeldelse"
      buttonUrl={reviewUrl}
    >
      <Text style={paragraph}>
        Hej{recipientName ? ` ${recipientName}` : ""},
      </Text>

      <Text style={paragraph}>
        Vi håber, at alt gik godt med {roleText}.
      </Text>

      <ListingCard
        title={listingTitle}
        imageUrl={listingImageUrl}
        subtitle="Afsluttet handel"
      />

      <Text style={paragraph}>
        Din anmeldelse hjælper andre brugere med at handle trygt og giver
        samtidig {otherPartyName} værdifuld feedback.
      </Text>

      <Text style={hint}>
        Det tager kun et øjeblik at dele din oplevelse – tak fordi du hjælper
        med at gøre Equishopper til en tryggere markedsplads.
      </Text>
    </EmailLayout>
  );
}

ReviewReminderEmail.PreviewProps = {
  recipientName: "Maria",
  otherPartyName: "Anne",
  listingTitle: 'Kentaur Ithaka dressursadel 17,5"',
  listingImageUrl:
    "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=1200&q=80",
  transactionRole: "buyer",
  reviewUrl: "https://equishopper.dk/orders/123/review",
} satisfies ReviewReminderEmailProps;

export default ReviewReminderEmail;

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