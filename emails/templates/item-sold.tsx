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
};

export function ItemSoldEmail({
  sellerName,
  buyerName,
  listingTitle,
  listingImageUrl,
  salePrice,
  orderUrl,
}: ItemSoldEmailProps) {
  return (
    <EmailLayout
      preview={`Din vare er solgt til ${buyerName}`}
      title="Tillykke! Din vare er solgt"
      badge="Salg gennemført"
      buttonText="Se ordren"
      buttonUrl={orderUrl}
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

      <Text style={paragraph}>
        Nu er det tid til at pakke varen forsvarligt og sende den hurtigst
        muligt. Når pakken er afsendt, kan du markere ordren som sendt direkte
        på Equishopper.
      </Text>

      <Text style={hint}>
        Husk at sende varen inden for den aftalte tidsfrist. Det giver den
        bedste oplevelse for både køber og sælger og hjælper med at sikre en
        tryg handel.
      </Text>
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
  orderUrl: "https://equishopper.dk/orders/123",
} satisfies ItemSoldEmailProps;

export default ItemSoldEmail;

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