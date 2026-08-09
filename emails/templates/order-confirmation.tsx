import { Text } from "@react-email/components";

import { EmailLayout } from "../components/email-layout";
import { InfoCard } from "../components/info-card";
import { ListingCard } from "../components/listing-card";

export type OrderConfirmationEmailProps = {
  buyerName?: string | null;
  sellerName: string;
  listingTitle: string;
  listingImageUrl?: string | null;
  itemPrice: string;
  shippingPrice?: string | null;
  totalPrice: string;
  orderNumber: string;
  orderUrl: string;
};

export function OrderConfirmationEmail({
  buyerName,
  sellerName,
  listingTitle,
  listingImageUrl,
  itemPrice,
  shippingPrice,
  totalPrice,
  orderNumber,
  orderUrl,
}: OrderConfirmationEmailProps) {
  return (
    <EmailLayout
      preview={`Tak for dit køb af ${listingTitle}`}
      title="Tak for dit køb"
      badge="Ordrebekræftelse"
      buttonText="Se din ordre"
      buttonUrl={orderUrl}
    >
      <Text style={paragraph}>
        Hej{buyerName ? ` ${buyerName}` : ""}
      </Text>

      <Text style={paragraph}>
        Tak for dit køb. Din ordre er gennemført, og {sellerName} har fået besked
        om salget.
      </Text>

      <ListingCard
        title={listingTitle}
        imageUrl={listingImageUrl}
        price={itemPrice}
        subtitle="Varepris"
      />

      <InfoCard
        items={[
          {
            label: "Ordrenummer",
            value: orderNumber,
          },
          ...(shippingPrice
            ? [
                {
                  label: "Fragt",
                  value: shippingPrice,
                },
              ]
            : []),
          {
            label: "I alt",
            value: totalPrice,
          },
        ]}
      />

      <Text style={paragraph}>
        Sælgeren gør nu varen klar til afsendelse. Du modtager en ny e-mail, så
        snart pakken er sendt, og du kan derefter følge leveringen direkte fra
        din ordre.
      </Text>

      <Text style={hint}>
        Du kan altid se ordredetaljer, betaling og den aktuelle status på din
        ordre via Equishopper.
      </Text>
    </EmailLayout>
  );
}

OrderConfirmationEmail.PreviewProps = {
  buyerName: "Maria",
  sellerName: "Anne",
  listingTitle: 'Kentaur Ithaka dressursadel 17,5"',
  listingImageUrl:
    "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=1200&q=80",
  itemPrice: "8.000 kr.",
  shippingPrice: "79 kr.",
  totalPrice: "8.079 kr.",
  orderNumber: "EQ-2026-00123",
  orderUrl: "https://equishopper.dk/orders/123",
} satisfies OrderConfirmationEmailProps;

export default OrderConfirmationEmail;

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