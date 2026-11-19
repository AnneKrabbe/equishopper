"use client";

import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

export default function FavoriteEmailPreference({ userId }: { userId: string }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data, error } = await supabase.from("favorite_email_preferences")
        .select("price_changes")
        .eq("user_id", userId)
        .maybeSingle();
      if (!mounted) return;
      if (error) {
        setMessage("Indstillingen kunne ikke hentes. Prøv at genindlæse siden.");
      } else {
        setEnabled(data?.price_changes ?? false);
      }
    }
    void load();
    return () => { mounted = false; };
  }, [userId]);

  async function save(value: boolean) {
    setSaving(true);
    setMessage("");
    try {
      const { error } = await supabase.from("favorite_email_preferences").upsert({
        user_id: userId,
        price_changes: value,
      }, { onConflict: "user_id" });
      if (error) throw error;
      setEnabled(value);
      setMessage(value ? "Prismails er slået til." : "Prismails er slået fra.");
    } catch {
      setMessage("Indstillingen kunne ikke gemmes. Prøv igen.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section id="prismails" className="mb-6 scroll-mt-36 rounded-[24px] border border-[#eadfcb] bg-white p-5 sm:p-6">
      <label className="flex items-start gap-3 font-semibold text-[#063f32]">
        <input
          type="checkbox"
          checked={enabled === true}
          disabled={saving || enabled === null}
          onChange={(event) => void save(event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-[#063f32]"
        />
        Få e-mail, når prisen på en favorit ændrer sig
      </label>
      <p role="status" className="mt-2 pl-7 text-sm text-stone-600">{message}</p>
    </section>
  );
}
