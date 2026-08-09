import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

import { EmailButton } from "./email-button";

type EmailLayoutProps = {
  preview: string;
  title: string;
  children: ReactNode;
  buttonText?: string;
  buttonUrl?: string;
  badge?: string;
};

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  "https://equishopper.dk";

function getPublicLogoUrl() {
  const configuredLogoUrl = process.env.EMAIL_LOGO_URL?.trim();

  if (!configuredLogoUrl) {
    return "https://equishopper.dk/images/equishopper-logo.png";
  }

  if (
    configuredLogoUrl.startsWith("https://") ||
    configuredLogoUrl.startsWith("http://")
  ) {
    return configuredLogoUrl;
  }

  if (configuredLogoUrl.startsWith("/")) {
    return `${appUrl}${configuredLogoUrl}`;
  }

  return `https://${configuredLogoUrl}`;
}

const logoUrl = getPublicLogoUrl();

export function EmailLayout({
  preview,
  title,
  children,
  buttonText,
  buttonUrl,
  badge,
}: EmailLayoutProps) {
  return (
    <Html lang="da">
      <Head />
      <Preview>{preview}</Preview>

      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Link href={appUrl} style={logoLink}>
              <Img
                src={logoUrl}
                alt="Equishopper"
                width="220"
                height="82"
                style={logo}
              />
            </Link>

            <Text style={tagline}>Brugt rideudstyr &amp; tilbehør</Text>
          </Section>

          <Section style={greenDivider}>
            <Text style={dividerText}>
              Markedspladsen for hesteudstyr
            </Text>
          </Section>

          <Section style={content}>
            {badge ? (
              <Section style={badgeSection}>
                <Text style={badgeStyle}>{badge}</Text>
              </Section>
            ) : null}

            <Heading style={heading}>{title}</Heading>

            {children}

            {buttonText && buttonUrl ? (
              <EmailButton href={buttonUrl}>
                {buttonText}
              </EmailButton>
            ) : null}
          </Section>

          <Hr style={divider} />

          <Section style={footer}>
            <Text style={footerBrand}>Equishopper</Text>

            <Text style={footerText}>
              Denne mail er sendt automatisk af Equishopper.
            </Text>

            <Text style={footerText}>
              Har du spørgsmål, er du velkommen til at kontakte os på{" "}
              <Link
                href="mailto:support@equishopper.dk"
                style={footerLink}
              >
                support@equishopper.dk
              </Link>
              .
            </Text>

            <Text style={footerLinks}>
              <Link href={`${appUrl}/handelsbetingelser`} style={footerLink}>
                Handelsbetingelser
              </Link>

              <Text style={footerSeparator}> · </Text>

              <Link href={`${appUrl}/privatlivspolitik`} style={footerLink}>
                Privatlivspolitik
              </Link>
            </Text>

            <Text style={copyright}>
              © {new Date().getFullYear()} Equishopper
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body = {
  backgroundColor: "#edf0eb",
  color: "#26382f",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
  margin: "0",
  padding: "28px 12px",
};

const container = {
  backgroundColor: "#ffffff",
  border: "1px solid #d8dfd9",
  borderRadius: "18px",
  boxShadow: "0 8px 28px rgba(23, 60, 42, 0.08)",
  margin: "0 auto",
  maxWidth: "600px",
  overflow: "hidden",
};

const header = {
  backgroundColor: "#ffffff",
  padding: "28px 32px 22px",
  textAlign: "center" as const,
};

const logoLink = {
  display: "inline-block",
  textDecoration: "none",
};

const logo = {
  border: "0",
  display: "block",
  height: "82px",
  margin: "0 auto",
  objectFit: "contain" as const,
  width: "220px",
};

const tagline = {
  color: "#5f6f65",
  fontSize: "11px",
  fontWeight: "700",
  letterSpacing: "1.8px",
  lineHeight: "18px",
  margin: "10px 0 0",
  textTransform: "uppercase" as const,
};

const greenDivider = {
  backgroundColor: "#123d2a",
  padding: "14px 24px",
  textAlign: "center" as const,
};

const dividerText = {
  color: "#ffffff",
  fontSize: "12px",
  fontWeight: "700",
  letterSpacing: "1.5px",
  lineHeight: "18px",
  margin: "0",
  textTransform: "uppercase" as const,
};

const content = {
  backgroundColor: "#ffffff",
  padding: "36px 32px 30px",
};

const badgeSection = {
  margin: "0 0 16px",
};

const badgeStyle = {
  backgroundColor: "#dce9df",
  border: "0",
  borderRadius: "999px",
  color: "#123d2a",
  display: "inline-block",
  fontSize: "11px",
  fontWeight: "800",
  letterSpacing: "1.1px",
  lineHeight: "18px",
  margin: "0",
  padding: "6px 13px",
  textTransform: "uppercase" as const,
};

const heading = {
  color: "#123d2a",
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: "28px",
  fontWeight: "600",
  letterSpacing: "-0.2px",
  lineHeight: "36px",
  margin: "0 0 24px",
};

const divider = {
  borderColor: "#dce3de",
  margin: "0 32px",
};

const footer = {
  backgroundColor: "#f7f9f7",
  padding: "25px 32px 29px",
  textAlign: "center" as const,
};

const footerBrand = {
  color: "#123d2a",
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: "18px",
  fontWeight: "600",
  letterSpacing: "0.8px",
  lineHeight: "24px",
  margin: "0 0 12px",
};

const footerText = {
  color: "#68736c",
  fontSize: "12px",
  lineHeight: "19px",
  margin: "0 0 8px",
};

const footerLinks = {
  fontSize: "12px",
  lineHeight: "19px",
  margin: "14px 0 0",
};

const footerLink = {
  color: "#245b40",
  textDecoration: "underline",
};

const footerSeparator = {
  color: "#7f8d84",
  display: "inline",
  margin: "0",
};

const copyright = {
  color: "#929b95",
  fontSize: "11px",
  lineHeight: "18px",
  margin: "16px 0 0",
};