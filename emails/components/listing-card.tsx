import {
  Img,
  Section,
  Text,
} from "@react-email/components";

type ListingCardProps = {
  title: string;
  imageUrl?: string | null;
  price?: string | null;
  subtitle?: string;
  size?: string;
};

const placeholder =
  "https://placehold.co/640x420/F4F0E6/6F6656?text=Equishopper";

export function ListingCard({
  title,
  imageUrl,
  price,
  subtitle,
  size,
}: ListingCardProps) {
  return (
    <Section style={card}>
      <Section style={imageWrapper}>
        <Img
          src={imageUrl || placeholder}
          alt={title}
          width="560"
          style={image}
        />
      </Section>

      <Section style={content}>
        <Text style={titleStyle}>{title}</Text>

        {subtitle ? (
          <Text style={subtitleStyle}>{subtitle}</Text>
        ) : null}

        <Text style={priceStyle}>{price}</Text>

        {size ? (
          <Text style={sizeStyle}>Størrelse: {size}</Text>
        ) : null}
      </Section>
    </Section>
  );
}

const card = {
  backgroundColor: "#ffffff",
  border: "1px solid #e8e2d8",
  borderRadius: "18px",
  margin: "28px 0",
  overflow: "hidden",
};

const imageWrapper = {
  backgroundColor: "#f7f3ec",
  padding: "18px",
};

const image = {
  display: "block",
  width: "100%",
  height: "auto",
  borderRadius: "12px",
};

const content = {
  padding: "24px",
};

const titleStyle = {
  color: "#1f5a3e",
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: "24px",
  fontWeight: "700",
  lineHeight: "32px",
  margin: "0 0 10px",
};

const subtitleStyle = {
  color: "#b08d57",
  fontSize: "12px",
  fontWeight: "700",
  textTransform: "uppercase" as const,
  letterSpacing: "1.2px",
  margin: "0 0 10px",
};

const priceStyle = {
  color: "#222222",
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: "32px",
  fontWeight: "700",
  lineHeight: "38px",
  margin: "0",
};

const sizeStyle = {
  color: "#6f6656",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "12px 0 0",
};