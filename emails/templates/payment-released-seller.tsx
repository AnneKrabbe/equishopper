import { Text } from "@react-email/components";

import { EmailLayout } from "../components/email-layout";
import { ListingCard } from "../components/listing-card";

export type PaymentReleasedSellerEmailProps = {
  sellerName?: string | null;
  listingTitle: string;
  salePrice: string;
  payoutAmount: string;
  orderUrl: string;
};

export function PaymentReleasedSellerEmail({
  sellerName,
  listingTitle,
  salePrice,
  payoutAmount,
  orderUrl,
}: PaymentReleasedSellerEmailProps) {
  return (
    <EmailLayout
      preview={`Din betaling for ${listingTitle} er frigivet`}
      title="Din betaling er frigivet"
      badge="Betaling frigivet"
      buttonText="Se ordren"
      buttonUrl={orderUrl}
    >
      <Text style={paragraph}>
        Hej{sellerName ? ` ${sellerName}` : ""}
      </Text>

      <Text style={paragraph}>
        Handlen er nu gennemført, og betalingen for din vare er frigivet til
        din Stripe-konto.
      </Text>

      <ListingCard
        title={listingTitle}
        price={salePrice}
        subtitle="Salgspris"
      />

      <Text style={amount}>
        Frigivet til dig: <strong>{payoutAmount}</strong>
      </Text>

      <Text style={paragraph}>
        Stripe udbetaler herefter pengene efter den udbetalingsplan, der er
        knyttet til din Stripe-konto.
      </Text>

      <Text style={hint}>
        Beløbet ovenfor er det beløb, Equishopper har frigivet til din
        Stripe-konto efter eventuelle gebyrer og justeringer.
      </Text>
    </EmailLayout>
  );
}

export default PaymentReleasedSellerEmail;

const paragraph = {
  color: "#465149",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 14px",
};

const amount = {
  color: "#063f32",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "18px 0 14px",
};

const hint = {
  color: "#7a7569",
  fontSize: "13px",
  lineHeight: "21px",
  margin: "20px 0 0",
};
