import { Link, Text } from "@react-email/components";

import { EmailLayout } from "../components/email-layout";

const siteUrl = "https://www.equishopper.dk";

const money = new Intl.NumberFormat("da-DK", {
  style: "currency",
  currency: "DKK",
});

export type MarketplaceAlertProps = {
  kind: "favorite_price" | "search_match";
  title: string;
  listingId: string;
  previousPrice: number | null;
  newPrice: number | null;
};

export function MarketplaceAlertEmail({
  kind,
  title,
  listingId,
  previousPrice,
  newPrice,
}: MarketplaceAlertProps) {
  const isPriceChange = kind === "favorite_price";
  const heading = isPriceChange
    ? "Ny pris på en favorit"
    : "Din søgeagent har fundet en ny annonce";
  const settingsPath = isPriceChange
    ? "/favorites#prismails"
    : "/soegeagenter";

  return (
    <EmailLayout
      preview={heading}
      title={heading}
      buttonText="Se annoncen"
      buttonUrl={`${siteUrl}/listing/${encodeURIComponent(listingId)}`}
    >
      <Text style={paragraph}>
        <strong>{title}</strong>
      </Text>

      {isPriceChange && previousPrice !== null && newPrice !== null ? (
        <Text style={paragraph}>
          Prisen er ændret fra {money.format(previousPrice)} til{" "}
          {money.format(newPrice)}.
        </Text>
      ) : newPrice !== null ? (
        <Text style={paragraph}>Pris {money.format(newPrice)}</Text>
      ) : null}

      <Text style={paragraph}>
        {isPriceChange
          ? "Du får denne mail, fordi varen ligger i dine favoritter."
          : "Du får denne mail, fordi annoncen matcher en af dine gemte søgninger."}
      </Text>

      <Text style={paragraph}>
        <Link
          href={`${siteUrl}${settingsPath}`}
          style={{ color: "#063f32", textDecoration: "underline" }}
        >
          {isPriceChange
            ? "Se dine favoritter"
            : "Administrér eller slet dine søgeagenter"}
        </Link>
      </Text>
    </EmailLayout>
  );
}

const paragraph = {
  color: "#465149",
  fontSize: "15px",
  lineHeight: "24px",
};