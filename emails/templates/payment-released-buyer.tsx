import { Text } from "@react-email/components";

import { EmailLayout } from "../components/email-layout";
import { ListingCard } from "../components/listing-card";

export type PaymentReleasedBuyerEmailProps = {
  buyerName?: string | null;
  listingTitle: string;
  salePrice: string;
  orderUrl: string;
};

export function PaymentReleasedBuyerEmail({
  buyerName,
  listingTitle,
  salePrice,
  orderUrl,
}: PaymentReleasedBuyerEmailProps) {
  return (
    <EmailLayout
      preview={`Handlen med ${listingTitle} er gennemført`}
      title="Din handel er gennemført"
      badge="Handel afsluttet"
      buttonText="Se ordren"
      buttonUrl={orderUrl}
    >
      <Text style={paragraph}>
        Hej{buyerName ? ` ${buyerName}` : ""}
      </Text>

      <Text style={paragraph}>
        Din handel er nu afsluttet, og betalingen er frigivet til sælger.
      </Text>

      <ListingCard
        title={listingTitle}
        price={salePrice}
        subtitle="Varepris"
      />

      <Text style={paragraph}>
        Tak fordi du handlede på Equishopper.
      </Text>

      <Text style={hint}>
        Har du allerede en åben sag om ordren, håndteres den fortsat gennem
        Equishopper.
      </Text>
    </EmailLayout>
  );
}

export default PaymentReleasedBuyerEmail;

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
