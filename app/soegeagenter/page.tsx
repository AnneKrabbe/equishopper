"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import Header from "@/components/home/Header";
import { listingSearchUrl, type SavedListingSearch } from "@/lib/listing-search-agents";
import { supabase } from "@/lib/supabase";

const money = new Intl.NumberFormat("da-DK", { style: "currency", currency: "DKK" });
const linkClass = "font-semibold text-[#063f32] underline underline-offset-4";

function describeSearch(search: SavedListingSearch) {
  return [
    search.search_query && `“${search.search_query}”`,
    search.category,
    search.subcategory || search.category_group,
    search.brand && `Mærke ${search.brand}`,
    search.size && `Størrelse ${search.size}`,
    search.condition,
    search.min_price !== null && `Fra ${money.format(search.min_price)}`,
    search.max_price !== null && `Op til ${money.format(search.max_price)}`,
  ].filter(Boolean).join(" · ");
}

export default function SavedListingSearchesPage() {
  const [searches, setSearches] = useState<SavedListingSearch[]>([]);
  const [status, setStatus] = useState<"loading" | "logged-out" | "failed" | "ready">("loading");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;
      if (error) {
        setStatus("failed");
        return;
      }
      if (!data.session) {
        setStatus("logged-out");
        return;
      }

      const result = await supabase.from("saved_listing_searches")
        .select("id, search_query, category, category_group, subcategory, group_subcategories, size, brand, condition, min_price, max_price")
        .order("created_at", { ascending: false });

      if (!mounted) return;
      if (result.error) {
        setStatus("failed");
      } else {
        setSearches((result.data ?? []) as SavedListingSearch[]);
        setStatus("ready");
      }
    }
    void load().catch(() => { if (mounted) setStatus("failed"); });
    return () => { mounted = false; };
  }, []);

  async function remove(id: string) {
    setDeletingId(id);
    setMessage("");
    try {
      const { error } = await supabase.from("saved_listing_searches").delete().eq("id", id);
      if (error) throw error;
      setSearches((current) => current.filter((search) => search.id !== id));
      setMessage("Søgeagenten er slettet.");
    } catch {
      setMessage("Søgeagenten kunne ikke slettes. Prøv igen.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-[#f8f6f1]">
        <section className="bg-[#063f32] px-5 pb-12 pt-36 sm:pb-16 sm:pt-40">
          <div className="mx-auto max-w-4xl">
            <h1 className="font-serif text-4xl text-white sm:text-6xl">Mine søgeagenter</h1>
            <p className="mt-4 text-base text-white/80">
              Få en e-mail, når der kommer en ny annonce, som matcher dine filtre.
            </p>
          </div>
        </section>
        <section className="mx-auto max-w-4xl px-5 py-10">
          {status === "loading" && <p role="status">Henter dine søgeagenter…</p>}
          {status === "failed" && <p role="alert">Dine søgeagenter kunne ikke hentes. Prøv at genindlæse siden.</p>}
          {status === "logged-out" && (
            <p><Link href="/login?redirect=%2Fsoegeagenter" className={linkClass}>Log ind</Link> for at se dine søgeagenter.</p>
          )}
          {status === "ready" && (
            <>
              {searches.length === 0 ? (
                <p className="text-stone-600">Vælg filtre under Annoncer, og klik på Gem søgeagent.</p>
              ) : (
                <ul className="space-y-3">
                  {searches.map((search) => (
                    <li key={search.id} className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-[#eadfcb] bg-white p-5">
                      <Link href={listingSearchUrl(search)} className={`${linkClass} min-w-0 break-words`}>
                        {describeSearch(search)}
                      </Link>
                      <button
                        type="button"
                        disabled={deletingId !== null}
                        onClick={() => void remove(search.id)}
                        aria-label={`Slet søgeagent for ${describeSearch(search)}`}
                        className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-[#063f32] hover:bg-stone-50 disabled:opacity-60"
                      >
                        {deletingId === search.id ? "Sletter…" : "Slet søgeagent"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p role="status" className="mt-3 text-sm text-stone-600">{message}</p>
              <Link href="/annoncer" className={`${linkClass} mt-5 inline-block`}>Se annoncer</Link>
            </>
          )}
        </section>
      </div>
    </>
  );
}
