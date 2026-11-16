"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";

import { listingSearchUrl, type ListingSearchCriteria } from "@/lib/listing-search-agents";
import { supabase } from "@/lib/supabase";

export default function SaveListingSearch({ criteria }: { criteria: ListingSearchCriteria }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [message, setMessage] = useState("");

  async function save() {
    setStatus("saving");
    setMessage("");

    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push(`/login?redirect=${encodeURIComponent(listingSearchUrl(criteria))}`);
        setStatus("idle");
        return;
      }

      const { error } = await supabase.from("saved_listing_searches").insert(criteria);
      if (error && error.code !== "23505") {
        if (error.code === "23514") {
          throw new Error("Tjek prisintervallet, eller gør søgeordet kortere.");
        }
        throw new Error("Søgeagenten kunne ikke gemmes. Prøv igen.");
      }

      setStatus("saved");
      setMessage(error ? "Du har allerede en søgeagent til denne søgning." : "Søgeagenten er oprettet.");
    } catch (error) {
      setStatus("idle");
      setMessage(error instanceof Error ? error.message : "Søgeagenten kunne ikke gemmes. Prøv igen.");
    }
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        onClick={() => void save()}
        disabled={status !== "idle"}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-[#d4af37] px-5 py-2.5 text-sm font-semibold text-[#063f32] transition hover:bg-[#e1c05a] disabled:opacity-60"
      >
        <Bell size={16} aria-hidden="true" />
        {status === "saving" ? "Gemmer…" : status === "saved" ? "Søgeagent gemt" : "Gem søgeagent"}
      </button>
      <span className="px-1 text-xs text-stone-600">Få e-mail om nye annoncer, der matcher.</span>
      <p role="status" className="max-w-xs px-1 text-sm text-stone-600">
        {message} {status === "saved" && <Link href="/soegeagenter" className="font-semibold underline">Mine søgeagenter</Link>}
      </p>
    </div>
  );
}
