import { Text } from "@react-email/components";

import { EmailLayout } from "../components/email-layout";
import { ListingCard } from "../components/listing-card";

export type ItemSoldEmailProps = {
  sellerName?: string | null;
  buyerName: string;
  listingTitle: string;
  listingImageUrl?: string | null;
  salePrice: string;
  orderUrl: string;
  payoutSetupRequired?: boolean;
  payoutSetupUrl?: string | null;
};

export function ItemSoldEmail({
  sellerName,
  buyerName,
  listingTitle,
  listingImageUrl,
  salePrice,
  orderUrl,
  payoutSetupRequired = false,
  payoutSetupUrl = null,
}: ItemSoldEmailProps) {
  const showPayoutSetup = payoutSetupRequired && Boolean(payoutSetupUrl);

  return (
    <EmailLayout
      preview={
        showPayoutSetup
          ? `Din vare er solgt – aktivér udbetaling`
          : `Din vare er solgt til ${buyerName}`
      }
      title="Tillykke! Din vare er solgt"
      badge="Salg gennemført"
      buttonText={showPayoutSetup ? "Aktivér udbetaling" : "Se ordren"}
      buttonUrl={showPayoutSetup ? payoutSetupUrl! : orderUrl}
    >
      <Text style={paragraph}>
        Hej{sellerName ? ` ${sellerName}` : ""}
      </Text>

      <Text style={paragraph}>
        Tillykke! {buyerName} har gennemført købet af din vare.
      </Text>

      <ListingCard
        title={listingTitle}
        imageUrl={listingImageUrl}
        price={salePrice}
        subtitle="Salgspris"
      />

      {showPayoutSetup ? (
        <>
          <Text style={payoutTitle}>Aktivér udbetaling</Text>

          <Text style={paragraph}>
            For at få pengene overført til dig skal du aktivere udbetaling.
            Du bliver sendt videre til vores sikre betalingspartner Stripe,
            hvor du færdiggør opsætningen.
          </Text>

          <Text style={hint}>
            Din vare er allerede solgt. Du kan færdiggøre udbetalingsopsætningen
            fra Equishopper nu eller senere, men den skal være klar, før
            betalingen kan overføres til dig.
          </Text>
        </>
      ) : (
        <>
          <Text style={paragraph}>
            Gå til din salgsoversigt på Equishopper for at se næste trin for
            ordren.
          </Text>

          <Text style={hint}>
            Følg leveringsoplysningerne på ordren, så handlen kan gennemføres
            trygt for både dig og køberen.
          </Text>
        </>
      )}

      {showPayoutSetup && (
        <Text style={secondaryLink}>
          Du kan også se ordren i din salgsoversigt på Equishopper: {orderUrl}
        </Text>
      )}
    </EmailLayout>
  );
}

ItemSoldEmail.PreviewProps = {
  sellerName: "Anne",
  buyerName: "Maria Nielsen",
  listingTitle: 'Kentaur Ithaka dressursadel 17,5"',
  listingImageUrl:
    "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=1200&q=80",
  salePrice: "8.000 kr.",
  orderUrl: "https://www.equishopper.dk/salg?order=123",
  payoutSetupRequired: true,
  payoutSetupUrl: "https://www.equishopper.dk/salg?setup=payout&order=123",
} satisfies ItemSoldEmailProps;

export default ItemSoldEmail;

const paragraph = {
  color: "#465149",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 14px",
};

const payoutTitle = {
  color: "#063f32",
  fontSize: "18px",
  fontWeight: "600",
  lineHeight: "26px",
  margin: "24px 0 10px",
};

const hint = {
  color: "#7a7569",
  fontSize: "13px",
  lineHeight: "21px",
  margin: "20px 0 0",
};

const secondaryLink = {
  color: "#7a7569",
  fontSize: "12px",
  lineHeight: "19px",
  margin: "18px 0 0",
  wordBreak: "break-word" as const,
};
