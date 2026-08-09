"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileSearch,
  Loader2,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import Header from "@/components/home/Header";
import { supabase } from "@/lib/supabase";

type DisputeStatus =
  | "open"
  | "awaiting_buyer"
  | "awaiting_seller"
  | "under_review"
  | "resolved_buyer"
  | "resolved_seller"
  | "partially_refunded"
  | "closed";

type DisputeReason =
  | "not_received"
  | "damaged"
  | "not_as_described"
  | "wrong_item"
  | "missing_parts"
  | "suspected_counterfeit"
  | "other";

type DisputeRow = {
  id: string;
  order_id: string;
  buyer_id: string;
  seller_id: string;
  opened_by: string;
  reason: DisputeReason;
  subject: string;
  description: string;
  status: DisputeStatus;
  refund_amount: number | null;
  created_at: string;
  updated_at: string;
};

type ProfileSummary = {
  id: string;
  full_name: string | null;
  username: string | null;
};

type StatusFilter = "all" | DisputeStatus;

const statusLabels: Record<DisputeStatus, string> = {
  open: "Ny",
  awaiting_buyer: "Afventer køber",
  awaiting_seller: "Afventer sælger",
  under_review: "Under behandling",
  resolved_buyer: "Afgjort til køber",
  resolved_seller: "Afgjort til sælger",
  partially_refunded: "Delvist refunderet",
  closed: "Lukket",
};

const reasonLabels: Record<DisputeReason, string> = {
  not_received: "Varen er ikke modtaget",
  damaged: "Varen er beskadiget",
  not_as_described: "Varen svarer ikke til annoncen",
  wrong_item: "Forkert vare",
  missing_parts: "Væsentlige dele mangler",
  suspected_counterfeit: "Mistanke om uægte vare",
  other: "Andet",
};

const activeStatuses: DisputeStatus[] = [
  "open",
  "awaiting_buyer",
  "awaiting_seller",
  "under_review",
];

export default function ProfileDisputesPage() {
  const router = useRouter();

  const [currentUserId, setCurrentUserId] = useState("");
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileSummary>>({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    void loadDisputes();
  }, []);

  async function loadDisputes() {
    try {
      setLoading(true);
      setErrorMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        router.replace("/login?redirect=/profil/tvister");
        return;
      }

      setCurrentUserId(user.id);

      const { data: disputeData, error: disputeError } = await supabase
        .from("disputes")
        .select(`
          id,
          order_id,
          buyer_id,
          seller_id,
          opened_by,
          reason,
          subject,
          description,
          status,
          refund_amount,
          created_at,
          updated_at
        `)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (disputeError) throw disputeError;

      const rows = (disputeData ?? []) as DisputeRow[];
      setDisputes(rows);

      const profileIds = Array.from(
        new Set(
          rows.flatMap((dispute) => [
            dispute.buyer_id,
            dispute.seller_id,
            dispute.opened_by,
          ])
        )
      );

      if (profileIds.length === 0) {
        setProfiles({});
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, username")
        .in("id", profileIds);

      if (profileError) throw profileError;

      setProfiles(
        Object.fromEntries(
          ((profileData ?? []) as ProfileSummary[]).map((profile) => [
            profile.id,
            profile,
          ])
        )
      );
    } catch (error) {
      console.error("Kunne ikke hente tvister:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Dine tvister kunne ikke hentes."
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredDisputes = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return disputes.filter((dispute) => {
      if (statusFilter !== "all" && dispute.status !== statusFilter) {
        return false;
      }

      if (!normalizedSearch) return true;

      const otherPartyId =
        dispute.buyer_id === currentUserId
          ? dispute.seller_id
          : dispute.buyer_id;

      const otherParty = profiles[otherPartyId];

      const searchableText = [
        dispute.id,
        dispute.order_id,
        dispute.subject,
        dispute.description,
        reasonLabels[dispute.reason],
        statusLabels[dispute.status],
        otherParty?.full_name,
        otherParty?.username,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [
    disputes,
    profiles,
    searchTerm,
    statusFilter,
    currentUserId,
  ]);

  const statistics = useMemo(() => {
    const active = disputes.filter((dispute) =>
      activeStatuses.includes(dispute.status)
    ).length;

    const awaitingYou = disputes.filter(
      (dispute) =>
        (dispute.status === "awaiting_buyer" &&
          dispute.buyer_id === currentUserId) ||
        (dispute.status === "awaiting_seller" &&
          dispute.seller_id === currentUserId)
    ).length;

    const underReview = disputes.filter(
      (dispute) => dispute.status === "under_review"
    ).length;

    const resolved = disputes.filter((dispute) =>
      [
        "resolved_buyer",
        "resolved_seller",
        "partially_refunded",
        "closed",
      ].includes(dispute.status)
    ).length;

    return { active, awaitingYou, underReview, resolved };
  }, [disputes, currentUserId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f8f5ee]">
        <Header />

        <div className="flex min-h-[70vh] items-center justify-center pt-24">
          <Loader2 className="h-9 w-9 animate-spin text-[#063f32]" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f5ee]">
      <Header />

      <section className="bg-[#063f32] px-4 pb-16 pt-32 sm:px-6 sm:pt-36 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#d4af37]">
            Min profil
          </p>

          <div className="mt-4 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="font-serif text-4xl font-bold text-white sm:text-5xl">
                Mine tvister
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-white/65">
                Se status, beskeder og dokumentation i dine aktive og afsluttede
                sager.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadDisputes()}
              className="inline-flex items-center justify-center rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Opdatér oversigt
            </button>
          </div>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          {errorMessage && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatisticCard
              title="Aktive sager"
              value={statistics.active}
              icon={<AlertTriangle className="h-5 w-5" />}
            />

            <StatisticCard
              title="Afventer dig"
              value={statistics.awaitingYou}
              icon={<Clock3 className="h-5 w-5" />}
            />

            <StatisticCard
              title="Under behandling"
              value={statistics.underReview}
              icon={<FileSearch className="h-5 w-5" />}
            />

            <StatisticCard
              title="Afsluttede"
              value={statistics.resolved}
              icon={<CheckCircle2 className="h-5 w-5" />}
            />
          </div>

          <section className="mt-7 overflow-hidden rounded-[28px] border border-[#e7e1d7] bg-white shadow-[0_18px_60px_rgba(35,45,40,0.06)]">
            <div className="border-b border-[#eadfcb] p-5 sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="font-serif text-2xl font-bold text-[#063f32]">
                    Dine sager
                  </h2>

                  <p className="mt-1 text-sm text-stone-500">
                    {filteredDisputes.length} sag
                    {filteredDisputes.length === 1 ? "" : "er"} vises
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <label className="relative min-w-0 sm:w-72">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />

                    <input
                      type="search"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Søg i dine tvister..."
                      className="w-full rounded-full border border-stone-300 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#0b5a47] focus:ring-4 focus:ring-[#0b5a47]/10"
                    />
                  </label>

                  <select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value as StatusFilter)
                    }
                    className="rounded-full border border-stone-300 bg-white px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-[#0b5a47] focus:ring-4 focus:ring-[#0b5a47]/10"
                  >
                    <option value="all">Alle statusser</option>

                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {filteredDisputes.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <ShieldCheck className="mx-auto h-11 w-11 text-stone-300" />

                <h3 className="mt-4 font-serif text-2xl text-[#063f32]">
                  Ingen tvister fundet
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">
                  Du har ingen sager, som matcher din søgning eller dit filter.
                  En tvist oprettes fra den relevante ordre.
                </p>

                <Link
                  href="/mine-ordrer"
                  className="mt-6 inline-flex rounded-full border border-[#063f32] px-6 py-3 text-sm font-semibold text-[#063f32] transition hover:bg-[#063f32] hover:text-white"
                >
                  Se mine ordrer
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-[#eadfcb]">
                {filteredDisputes.map((dispute) => {
                  const isBuyer = dispute.buyer_id === currentUserId;
                  const otherParty = profiles[
                    isBuyer ? dispute.seller_id : dispute.buyer_id
                  ];

                  return (
                    <DisputeListItem
                      key={dispute.id}
                      dispute={dispute}
                      role={isBuyer ? "Køber" : "Sælger"}
                      otherParty={otherParty}
                    />
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function StatisticCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-[#e7e1d7] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-stone-500">{title}</p>

          <p className="mt-2 font-serif text-3xl font-bold text-[#063f32]">
            {value}
          </p>
        </div>

        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f0f5f1] text-[#0b5a47]">
          {icon}
        </span>
      </div>
    </div>
  );
}

function DisputeListItem({
  dispute,
  role,
  otherParty,
}: {
  dispute: DisputeRow;
  role: "Køber" | "Sælger";
  otherParty?: ProfileSummary;
}) {
  return (
    <article className="p-5 transition hover:bg-[#fbfaf7] sm:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={dispute.status} />

            <span className="text-xs font-medium text-stone-400">
              {formatDate(dispute.created_at)}
            </span>
          </div>

          <Link
            href={`/profil/tvister/${dispute.id}`}
            className="mt-3 block truncate font-serif text-xl font-bold text-[#063f32] transition hover:text-[#0b5a47] hover:underline"
          >
            {dispute.subject}
          </Link>

          <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-600">
            {reasonLabels[dispute.reason]}
          </p>

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-stone-500">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" />
              Din rolle: {role}
            </span>

            <span className="inline-flex items-center gap-1.5">
              <UserRound className="h-4 w-4" />
              Modpart: {formatProfileName(otherParty)}
            </span>

            <span className="font-mono text-xs">
              Ordre: {shortId(dispute.order_id)}
            </span>
          </div>
        </div>

        <Link
          href={`/profil/tvister/${dispute.id}`}
          className="inline-flex flex-none items-center justify-center rounded-full border border-[#063f32] px-5 py-2.5 text-sm font-semibold text-[#063f32] transition hover:bg-[#063f32] hover:text-white"
        >
          Åbn sag
        </Link>
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: DisputeStatus }) {
  const styles: Record<DisputeStatus, string> = {
    open: "border-amber-200 bg-amber-50 text-amber-800",
    awaiting_buyer: "border-blue-200 bg-blue-50 text-blue-800",
    awaiting_seller: "border-violet-200 bg-violet-50 text-violet-800",
    under_review: "border-[#b9d5c8] bg-[#edf5f0] text-[#0b5a47]",
    resolved_buyer: "border-emerald-200 bg-emerald-50 text-emerald-800",
    resolved_seller: "border-emerald-200 bg-emerald-50 text-emerald-800",
    partially_refunded: "border-cyan-200 bg-cyan-50 text-cyan-800",
    closed: "border-stone-200 bg-stone-100 text-stone-700",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}

function formatProfileName(profile?: ProfileSummary) {
  if (!profile) return "Ukendt bruger";
  if (profile.full_name) return profile.full_name;
  if (profile.username) return `@${profile.username}`;
  return "Ukendt bruger";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("da-DK", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function shortId(value: string) {
  return value.length > 12 ? `${value.slice(0, 8)}…` : value;
}