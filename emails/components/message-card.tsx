import { Section, Text } from "@react-email/components";

type MessageCardProps = {
  label?: string;
  message: string;
};

export function MessageCard({
  label = "Besked",
  message,
}: MessageCardProps) {
  return (
    <Section style={card}>
      <Text style={labelStyle}>{label}</Text>

      <Text style={messageStyle}>{message}</Text>
    </Section>
  );
}

const card = {
  backgroundColor: "#faf8f4",
  border: "1px solid #e8e2d8",
  borderRadius: "18px",
  margin: "24px 0",
  padding: "22px 24px",
};

const labelStyle = {
  color: "#8b7d69",
  fontSize: "12px",
  fontWeight: "700",
  letterSpacing: "1px",
  margin: "0 0 12px",
  textTransform: "uppercase" as const,
};

const messageStyle = {
  color: "#465149",
  fontSize: "15px",
  lineHeight: "26px",
  margin: "0",
  whiteSpace: "pre-wrap" as const,
};