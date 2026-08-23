import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import Footer from "@/components/home/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://equishopper.dk"),

  title: {
    default: "Equishopper | Køb og sælg brugt rideudstyr",
    template: "%s | Equishopper",
  },

  description:
    "Køb og sælg brugt rideudstyr på Equishopper. Find brugte sadler, dækkener, trenser, ridetøj og andet udstyr til hest og rytter.",

  applicationName: "Equishopper",

  keywords: [
    "brugt rideudstyr",
    "rideudstyr",
    "brugt hesteudstyr",
    "hesteudstyr",
    "brugte sadler",
    "brugte dækkener",
    "ridetøj",
    "køb rideudstyr",
    "sælg rideudstyr",
  ],

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",
    locale: "da_DK",
    url: "https://equishopper.dk",
    siteName: "Equishopper",
    title: "Equishopper | Køb og sælg brugt rideudstyr",
    description:
      "Danmarks markedsplads for køb og salg af brugt rideudstyr til hest og rytter.",
  },

  twitter: {
    card: "summary_large_image",
    title: "Equishopper | Køb og sælg brugt rideudstyr",
    description:
      "Danmarks markedsplads for køb og salg af brugt rideudstyr til hest og rytter.",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="da"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-screen flex-col">
        <main className="flex-1">{children}</main>

        <Footer />
      </body>
    </html>
  );
}