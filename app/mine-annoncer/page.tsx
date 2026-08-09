"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/home/Header";
import { supabase } from "@/lib/supabase";
import {
  Eye,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";

type ListingImage = {
  id: string;
  image_url: string;
  sort_order: number | null;
};

type Listing = {
  id: string;
  title: string;
  price: number;
  status: string | null;
  reserved_by: string | null;
  deleted_at: string | null;
  created_at: string | null;
  main_category: string | null;
  subcategory: string | null;
  listing_images: ListingImage[] | null;
};

export default function MineAnnoncerPage() {
  const router = useRouter();

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [listingToDelete, setListingToDelete] = useState<Listing | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    void loadListings();
  }, []);

  async function loadListings() {
    setLoading(true);
    setPageError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        router.replace("/login?redirect=/mine-annoncer");
        return;
      }

      const { data, error } = await supabase
        .from("listings")
        .select(`
          id,
          title,
          price,
          status,
          reserved_by,
          deleted_at,
          created_at,
          main_category,
          subcategory,
          listing_images (
            id,
            image_url,
            sort_order
          )
        `)
        .eq("seller_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setListings((data ?? []) as Listing[]);
    } catch (error) {
      console.error("Kunne ikke hente dine annoncer:", error);
      setPageError(
        error instanceof Error
          ? error.message
          : "Dine annoncer kunne ikke hentes."
      );
    } finally {
      setLoading(false);
    }
  }

  const groupedListings = useMemo(() => {
    return {
      active: listings.filter(
        (listing) => getListingStatus(listing).key === "active"
      ),
      reserved: listings.filter(
        (listing) => getListingStatus(listing).key === "reserved"
      ),
      sold: listings.filter(
        (listing) => getListingStatus(listing).key === "sold"
      ),
      other: listings.filter(
        (listing) => getListingStatus(listing).key === "other"
      ),
    };
  }, [listings]);

  async function handleDeleteListing() {
    if (!listingToDelete || deleting) return;

    setDeleting(true);
    setDeleteError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Du skal være logget ind.");

      const { data: ownedListing, error: ownershipError } = await supabase
        .from("listings")
        .select("id, status, reserved_by, deleted_at")
        .eq("id", listingToDelete.id)
        .eq("seller_id", user.id)
        .maybeSingle();

      if (ownershipError) throw ownershipError;

      if (!ownedListing) {
        throw new Error("Du har ikke adgang til at slette denne annonce.");
      }

      if (ownedListing.deleted_at) {
        setListings((current) =>
          current.filter((listing) => listing.id !== listingToDelete.id),
        );
        setListingToDelete(null);
        return;
      }

      const normalizedStatus =
        ownedListing.status?.trim().toLowerCase() ?? "";

      if (
        ownedListing.reserved_by ||
        normalizedStatus === "reserved"
      ) {
        throw new Error(
          "En reserveret annonce kan ikke slettes, mens der er en igangværende handel.",
        );
      }

      /*
       * Soft delete:
       * Vi bevarer annoncen og billederne til ordre-, tvist- og
       * revisionshistorik, men skjuler den fra markedspladsen.
       */
      const { data: deletedListing, error: softDeleteError } =
        await supabase
          .from("listings")
          .update({
            status: "deleted",
            deleted_at: new Date().toISOString(),
            reserved_by: null,
            reserved_at: null,
          })
          .eq("id", listingToDelete.id)
          .eq("seller_id", user.id)
          .is("deleted_at", null)
          .select("id")
          .maybeSingle();

      if (softDeleteError) throw softDeleteError;

      if (!deletedListing) {
        throw new Error(
          "Annoncen kunne ikke slettes. Prøv at opdatere siden og forsøg igen.",
        );
      }

      setListings((current) =>
        current.filter((listing) => listing.id !== listingToDelete.id),
      );

      setListingToDelete(null);
    } catch (error) {
      console.error("Kunne ikke slette annoncen:", error);
      setDeleteError(
        error instanceof Error
          ? error.message
          : "Annoncen kunne ikke slettes.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f8f6f1]">
      <Header />

      <div className="mx-auto max-w-7xl px-4 pb-20 pt-32 md:px-8 md:pt-36">
        <div className="flex flex-col gap-6 border-b border-[#e4d8c5] pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.4em] text-[#b79a3d]">
              Din sælgeroversigt
            </p>

            <h1 className="font-serif text-[42px] leading-none text-[#063f32] md:text-6xl">
              Mine annoncer
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-stone-600">
              Se, rediger og administrer dine annoncer samlet ét sted.
            </p>
          </div>

          <Link
            href="/sell"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#063f32] px-6 py-3.5 font-medium text-white transition hover:bg-[#052f26] md:w-auto"
          >
            <Plus className="h-5 w-5" />
            Opret ny annonce
          </Link>
        </div>

        {loading ? (
          <div className="flex min-h-[360px] items-center justify-center">
            <div className="flex items-center gap-3 text-[#063f32]">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Henter dine annoncer...</span>
            </div>
          </div>
        ) : pageError ? (
          <div className="mt-10 rounded-[24px] border border-red-200 bg-red-50 p-6 text-red-700">
            <p className="font-semibold">Dine annoncer kunne ikke hentes</p>
            <p className="mt-2 text-sm leading-6">{pageError}</p>

            <button
              type="button"
              onClick={() => void loadListings()}
              className="mt-5 rounded-full bg-[#063f32] px-5 py-3 text-sm font-medium text-white"
            >
              Prøv igen
            </button>
          </div>
        ) : listings.length === 0 ? (
          <div className="mt-10 rounded-[30px] border border-[#eadfcb] bg-[#fbfaf7] px-6 py-16 text-center shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f1ece2] text-[#063f32]">
              <Plus className="h-7 w-7" />
            </div>

            <h2 className="mt-6 font-serif text-3xl text-[#063f32]">
              Du har ingen annoncer endnu
            </h2>

            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-stone-600">
              Opret din første annonce og gør dit udstyr synligt for købere på
              Equishopper.
            </p>

            <Link
              href="/sell"
              className="mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-[#d4af37] px-6 py-3.5 font-semibold text-[#063f32] transition hover:bg-[#e1c05a]"
            >
              <Plus className="h-5 w-5" />
              Opret annonce
            </Link>
          </div>
        ) : (
          <div className="mt-10 space-y-12">
            <ListingSection
              title="Aktive annoncer"
              listings={groupedListings.active}
              onDelete={setListingToDelete}
            />

            <ListingSection
              title="Reserverede annoncer"
              listings={groupedListings.reserved}
              onDelete={setListingToDelete}
            />

            <ListingSection
              title="Solgte annoncer"
              listings={groupedListings.sold}
              onDelete={setListingToDelete}
            />

            <ListingSection
              title="Andre annoncer"
              listings={groupedListings.other}
              onDelete={setListingToDelete}
            />
          </div>
        )}
      </div>

      {listingToDelete && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm"
          onClick={() => {
            if (!deleting) {
              setListingToDelete(null);
              setDeleteError("");
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-[28px] border border-[#eadfcb] bg-[#fbfaf7] p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-red-600">
                  Slet annonce
                </p>

                <h2 className="mt-2 font-serif text-3xl text-[#063f32]">
                  Er du sikker?
                </h2>
              </div>

              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  setListingToDelete(null);
                  setDeleteError("");
                }}
                className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-white text-[#063f32] shadow-sm transition hover:bg-stone-100 disabled:opacity-50"
                aria-label="Luk"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-5 text-sm leading-6 text-stone-600">
              Du er ved at slette{" "}
              <strong className="text-[#063f32]">
                {listingToDelete.title}
              </strong>
              . Annoncen fjernes fra markedspladsen, men vi bevarer
              oplysninger og billeder til eventuel ordre- og tvistdokumentation.
            </p>

            {deleteError && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {deleteError}
              </div>
            )}

            <div className="mt-7 flex gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  setListingToDelete(null);
                  setDeleteError("");
                }}
                className="flex-1 rounded-full border border-[#d9ccb4] px-5 py-3.5 font-medium text-[#063f32] transition hover:bg-white disabled:opacity-50"
              >
                Annuller
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleDeleteListing()}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-red-700 px-5 py-3.5 font-medium text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Trash2 className="h-5 w-5" />
                )}

                {deleting ? "Sletter..." : "Slet annonce"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function ListingSection({
  title,
  listings,
  onDelete,
}: {
  title: string;
  listings: Listing[];
  onDelete: (listing: Listing) => void;
}) {
  if (listings.length === 0) return null;

  return (
    <section>
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="font-serif text-3xl text-[#063f32]">{title}</h2>

        <span className="rounded-full bg-[#eee7da] px-3 py-1 text-xs font-semibold text-[#063f32]">
          {listings.length}
        </span>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {listings.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            onDelete={() => onDelete(listing)}
          />
        ))}
      </div>
    </section>
  );
}

function ListingCard({
  listing,
  onDelete,
}: {
  listing: Listing;
  onDelete: () => void;
}) {
  const images = [...(listing.listing_images ?? [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );

  const coverImage = images[0]?.image_url ?? null;
  const status = getListingStatus(listing);

  return (
    <article className="overflow-hidden rounded-[26px] border border-[#eadfcb] bg-[#fbfaf7] shadow-[0_14px_35px_rgba(0,0,0,0.045)]">
      <Link
        href={`/listing/${listing.id}`}
        className="relative block aspect-[4/3] overflow-hidden bg-[#f1ece2]"
      >
        {coverImage ? (
          <img
            src={coverImage}
            alt={listing.title}
            className="h-full w-full object-cover transition duration-500 hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <img
              src="/images/equishopper-grey-logo.png"
              alt=""
              className="h-20 opacity-35"
            />
          </div>
        )}

        <span
          className={`absolute left-4 top-4 rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] ${status.className}`}
        >
          {status.label}
        </span>
      </Link>

      <div className="p-5">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] text-[#b79a3d]">
            {[listing.main_category, listing.subcategory]
              .filter(Boolean)
              .join(" · ") || "Annonce"}
          </p>

          <Link href={`/listing/${listing.id}`}>
            <h3 className="mt-2 line-clamp-2 font-serif text-2xl leading-tight text-[#063f32] transition hover:text-[#b79a3d]">
              {listing.title}
            </h3>
          </Link>

          <p className="mt-4 text-xl font-semibold text-black">
            {Number(listing.price).toLocaleString("da-DK")} kr.
          </p>

          <p className="mt-2 text-xs text-stone-500">
            Oprettet {formatDate(listing.created_at)}
          </p>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2">
          <Link
            href={`/listing/${listing.id}`}
            className="flex items-center justify-center gap-1.5 rounded-full border border-[#d9ccb4] px-3 py-2.5 text-sm font-medium text-[#063f32] transition hover:bg-white"
          >
            <Eye className="h-4 w-4" />
            Se
          </Link>

          <Link
            href={`/listing/${listing.id}/rediger`}
            className="flex items-center justify-center gap-1.5 rounded-full bg-[#063f32] px-3 py-2.5 text-sm font-medium text-white transition hover:bg-[#052f26]"
          >
            <Pencil className="h-4 w-4" />
            Rediger
          </Link>

          <button
            type="button"
            onClick={onDelete}
            disabled={status.key === "reserved"}
            title={
              status.key === "reserved"
                ? "En reserveret annonce kan ikke slettes, mens handlen er i gang."
                : "Slet annonce"
            }
            className="flex items-center justify-center gap-1.5 rounded-full border border-red-200 px-3 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-stone-200 disabled:text-stone-400 disabled:hover:bg-transparent"
          >
            <Trash2 className="h-4 w-4" />
            Slet
          </button>
        </div>
      </div>
    </article>
  );
}

function getListingStatus(listing: Listing): {
  key: "active" | "reserved" | "sold" | "other";
  label: string;
  className: string;
} {
  const normalizedStatus = listing.status?.trim().toLowerCase();

  if (listing.reserved_by || normalizedStatus === "reserved") {
    return {
      key: "reserved",
      label: "Reserveret",
      className: "bg-amber-100 text-amber-800",
    };
  }

  if (
    normalizedStatus === "sold" ||
    normalizedStatus === "solgt" ||
    normalizedStatus === "completed"
  ) {
    return {
      key: "sold",
      label: "Solgt",
      className: "bg-stone-800 text-white",
    };
  }

  if (!normalizedStatus || normalizedStatus === "active") {
    return {
      key: "active",
      label: "Aktiv",
      className: "bg-[#063f32] text-white",
    };
  }

  return {
    key: "other",
    label: listing.status || "Ukendt",
    className: "bg-stone-200 text-stone-700",
  };
}

function formatDate(value: string | null) {
  if (!value) return "ukendt dato";

  return new Intl.DateTimeFormat("da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}