import { Button } from "@react-email/components";
import type { ReactNode } from "react";

type Props = {
  href: string;
  children: ReactNode;
};

export function EmailButton({ href, children }: Props) {
  return (
    <Button href={href} style={button}>
      {children}
    </Button>
  );
}

const button = {
  backgroundColor: "#173c2a",
  border: "0",
  borderRadius: "999px",
  color: "#ffffff",
  display: "block",
  fontSize: "15px",
  fontWeight: "700",
  letterSpacing: "0.3px",
  margin: "30px auto 10px",
  padding: "16px 34px",
  textAlign: "center" as const,
  textDecoration: "none",
};