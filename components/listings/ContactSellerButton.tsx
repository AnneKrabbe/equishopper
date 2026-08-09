"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getOrCreateConversation } from "@/lib/chat/getOrCreateConversation";

type Props = {
  listingId: string;
  sellerId: string;
};

export default function ContactSellerButton({
  listingId,
  sellerId,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    try {
      setLoading(true);

      const conversation = await getOrCreateConversation({
        listingId,
        sellerId,
      });

      router.push(`/beskeder/${conversation.id}`);
    } catch (err) {
      console.error(err);
      alert("Kunne ikke starte samtalen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="w-full rounded-xl border border-[#0E5C4A] bg-white px-4 py-3 font-medium text-[#0E5C4A] transition hover:bg-[#f2faf7] disabled:opacity-50"
    >
      {loading ? "Åbner..." : "💬 Send besked"}
    </button>
  );
}