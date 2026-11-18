"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Carrier = "dao" | "gls" | "postnord";
type Props = {
  orderId: string;
  carrier: Carrier | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  isSeller: boolean;
};

const TRACKING_SLUG = { dao: "dao", gls: "gls", postnord: "pdk" } as const;
export default function ShippingDocuments({ orderId, carrier, trackingNumber, trackingUrl, isSeller }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const fallback = carrier && trackingNumber
    ? `https://track.shipmondo.com/${TRACKING_SLUG[carrier]}/${encodeURIComponent(trackingNumber)}`
    : null;
  const link = trackingUrl?.startsWith("https://") ? trackingUrl : fallback;
  async function downloadDocument() {
    if (!isSeller || !carrier || carrier === "dao" || loading) return;
    setLoading(true); setMessage("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Log ind igen for at hente fragtpapirer.");
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/shipping-document?format=auto`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!response.ok) {
        const info = await response.json().catch(() => ({}));
        throw new Error(info.error || "Fragtpapiret kunne ikke hentes.");
      }
      const blob = await response.blob();
      const filename = response.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] || "fragtlabel.pdf";
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = filename;
      document.body.append(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Fragtpapiret kunne ikke hentes.");
    } finally { setLoading(false); }
  }
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
      {link && <a href={link} target="_blank" rel="noopener noreferrer" className="rounded-full border border-[#0b5a47] px-4 py-2 font-semibold text-[#063f32]">Spor pakke</a>}
      {isSeller && carrier && carrier !== "dao" && (
        <button type="button" disabled={loading} onClick={downloadDocument}
          className="rounded-full bg-[#063f32] px-4 py-2 font-semibold text-white disabled:opacity-50">
          {loading ? "Henter fragtpapir..." : "Hent QR eller fragtlabel"}
        </button>
      )}
      {message && <p role="alert" className="w-full text-red-700">{message}</p>}
    </div>
  );
}
