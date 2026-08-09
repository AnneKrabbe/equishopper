import { Section, Text } from "@react-email/components";

type Item = {
  label: string;
  value: string;
};

type InfoCardProps = {
  items: Item[];
};

export function InfoCard({ items }: InfoCardProps) {
  return (
    <Section style={card}>
      {items.map((item, index) => (
        <Section
          key={item.label}
          style={{
            ...row,
            ...(index < items.length - 1 ? divider : {}),
          }}
        >
          <Text style={label}>{item.label}</Text>
          <Text style={value}>{item.value}</Text>
        </Section>
      ))}
    </Section>
  );
}

const card = {
  backgroundColor: "#faf8f4",
  border: "1px solid #e8e2d8",
  borderRadius: "18px",
  margin: "24px 0",
  overflow: "hidden",
};

const row = {
  padding: "18px 22px",
};

const divider = {
  borderBottom: "1px solid #ece6dc",
};

const label = {
  color: "#8b7d69",
  fontSize: "12px",
  fontWeight: "700",
  textTransform: "uppercase" as const,
  letterSpacing: "1px",
  margin: "0 0 6px",
};

const value = {
  color: "#1f5a3e",
  fontSize: "18px",
  fontWeight: "700",
  lineHeight: "24px",
  margin: "0",
};