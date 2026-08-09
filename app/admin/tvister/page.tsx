"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
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
  subject: string;
  description: string;
  reason: DisputeReason;
  status: DisputeStatus;
  assigned_admin_id: string | null;
  resolution_summary: string | null;
  resolution_type: string | null;
  resolution_error: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
};

type OrderRow = {
  id: string;
  total: number | string | null;
  currency: string | null;
  payment_status: string | null;
  payout_status: string | null;
  refund_status: string | null;
};

type DisputeView = DisputeRow & {
  buyerName: string;
  sellerName: string;
  orderTotal: number;
  paymentStatus: string;
  payoutStatus: string;
  refundStatus: string;
};

type StatusFilter =
  | "all"
  | "active"
  | "waiting"
  | "resolved";

const STATUS_LABELS: Record<DisputeStatus, string> = {
  open: "Ny",
  awaiting_buyer: "Afventer køber",
  awaiting_seller: "Afventer sælger",
  under_review: "Under behandling",
  resolved_buyer: "Afgjort til køber",
  resolved_seller: "Afgjort til sælger",
  partially_refunded: "Delvist refunderet",
  closed: "Lukket",
};

const REASON_LABELS: Record<DisputeReason, string> = {
  not_received: "Varen er ikke modtaget",
  damaged: "Varen er beskadiget",
  not_as_described: "Varen svarer ikke til annoncen",
  wrong_item: "Forkert vare",
  missing_parts: "Væsentlige dele mangler",
  suspected_counterfeit: "Mistanke om uægte vare",
  other: "Andet",
};

const ACTIVE_STATUSES: DisputeStatus[] = [
  "open",
  "awaiting_buyer",
  "awaiting_seller",
  "under_review",
];

const WAITING_STATUSES: DisputeStatus[] = [
  "awaiting_buyer",
  "awaiting_seller",
];

const RESOLVED_STATUSES: DisputeStatus[] = [
  "resolved_buyer",
  "resolved_seller",
  "partially_refunded",
  "closed",
];

export default function AdminDisputesPage() {
  const router = useRouter();

  const [disputes, setDisputes] = useState<DisputeView[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("active");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    void loadDisputes();
  }, []);

  async function loadDisputes(options?: { silent?: boolean }) {
    try {
      if (options?.silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        router.replace("/login?redirect=/admin/tvister");
        return;
      }

      const { data: adminProfile, error: profileError } =
        await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (adminProfile?.role !== "admin") {
        setAuthorized(false);
        setErrorMessage("Du har ikke adgang til adminområdet.");
        return;
      }

      setAuthorized(true);

      const { data: disputeData, error: disputeError } =
        await supabase
          .from("disputes")
          .select(`
            id,
            order_id,
            buyer_id,
            seller_id,
            opened_by,
            subject,
            description,
            reason,
            status,
            assigned_admin_id,
            resolution_summary,
            resolution_type,
            resolution_error,
            created_at,
            updated_at,
            resolved_at,
            closed_at
          `)
          .order("created_at", { ascending: false });

      if (disputeError) {
        throw disputeError;
      }

      const disputeRows = (disputeData ?? []) as DisputeRow[];

      if (disputeRows.length === 0) {
        setDisputes([]);
        return;
      }

      const profileIds = Array.from(
        new Set(
          disputeRows.flatMap((dispute) => [
            dispute.buyer_id,
            dispute.seller_id,
          ]),
        ),
      );

      const orderIds = Array.from(
        new Set(disputeRows.map((dispute) => dispute.order_id)),
      );

      const [profilesResult, ordersResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, username")
          .in("id", profileIds),

        supabase
          .from("orders")
          .select(`
            id,
            total,
            currency,
            payment_status,
            payout_status,
            refund_status
          `)
          .in("id", orderIds),
      ]);

      if (profilesResult.error) {
        throw profilesResult.error;
      }

      if (ordersResult.error) {
        throw ordersResult.error;
      }

      const profiles = (profilesResult.data ?? []) as ProfileRow[];
      const orders = (ordersResult.data ?? []) as OrderRow[];

      const profileMap = new Map(
        profiles.map((profile) => [
          profile.id,
          formatProfileName(profile),
        ]),
      );

      const orderMap = new Map(
        orders.map((order) => [order.id, order]),
      );

      const views: DisputeView[] = disputeRows.map((dispute) => {
        const order = orderMap.get(dispute.order_id);

        return {
          ...dispute,
          buyerName:
            profileMap.get(dispute.buyer_id) ?? "Ukendt køber",
          sellerName:
            profileMap.get(dispute.seller_id) ?? "Ukendt sælger",
          orderTotal: Number(order?.total ?? 0),
          paymentStatus: order?.payment_status ?? "ukendt",
          payoutStatus: order?.payout_status ?? "ukendt",
          refundStatus: order?.refund_status ?? "none",
        };
      });

      setDisputes(views);
    } catch (error) {
      console.error("Tvistoversigten kunne ikke hentes:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Tvistoversigten kunne ikke hentes.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const filteredDisputes = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return disputes.filter((dispute) => {
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
            ? ACTIVE_STATUSES.includes(dispute.status)
            : statusFilter === "waiting"
              ? WAITING_STATUSES.includes(dispute.status)
              : RESOLVED_STATUSES.includes(dispute.status);

      if (!matchesStatus) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [
        dispute.subject,
        dispute.description,
        dispute.order_id,
        dispute.id,
        dispute.buyerName,
        dispute.sellerName,
        REASON_LABELS[dispute.reason],
        STATUS_LABELS[dispute.status],
      ].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      );
    });
  }, [disputes, searchQuery, statusFilter]);

  const counts = useMemo(
    () => ({
      active: disputes.filter((dispute) =>
        ACTIVE_STATUSES.includes(dispute.status),
      ).length,
      waiting: disputes.filter((dispute) =>
        WAITING_STATUSES.includes(dispute.status),
      ).length,
      resolved: disputes.filter((dispute) =>
        RESOLVED_STATUSES.includes(dispute.status),
      ).length,
    }),
    [disputes],
  );

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

  if (!authorized) {
    return (
      <main className="min-h-screen bg-[#f8f5ee]">
        <Header />

        <section className="mx-auto max-w-2xl px-5 pb-20 pt-36">
          <div className="rounded-[30px] border border-red-200 bg-white p-8 text-center shadow-sm">
            <ShieldAlert className="mx-auto h-12 w-12 text-red-600" />

            <h1 className="mt-5 font-serif text-3xl font-bold text-[#063f32]">
              Ingen adgang
            </h1>

            <p className="mt-3 text-stone-600">
              {errorMessage || "Du har ikke adgang til adminområdet."}
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f5ee]">
      <Header />

      <section className="bg-[#063f32] px-4 pb-16 pt-32 sm:px-6 sm:pt-36 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#d4af37]">
            Administration
          </p>

          <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="font-serif text-4xl font-bold text-white sm:text-5xl">
                Tvister
              </h1>

              <p className="mt-4 max-w-2xl leading-7 text-white/65">
                Se åbne sager, følg ventende dokumentation og åbn den
                enkelte tvist til behandling.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadDisputes({ silent: true })}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 self-start rounded-full border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white hover:text-[#063f32] disabled:cursor-not-allowed disabled:opacity-60 lg:self-auto"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing ? "animate-spin" : ""
                }`}
              />
              Opdater
            </button>
          </div>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          {errorMessage && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-none" />
              <p>{errorMessage}</p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <SummaryCard
              label="Aktive sager"
              value={counts.active}
              icon={<Clock3 className="h-5 w-5" />}
            />

            <SummaryCard
              label="Afventer en part"
              value={counts.waiting}
              icon={<UserRound className="h-5 w-5" />}
            />

            <SummaryCard
              label="Afsluttede sager"
              value={counts.resolved}
              icon={<CheckCircle2 className="h-5 w-5" />}
            />
          </div>

          <div className="mt-7 rounded-[28px] border border-[#e7e1d7] bg-white p-5 shadow-sm md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />

                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) =>
                    setSearchQuery(event.target.value)
                  }
                  placeholder="Søg efter sag, ordre eller bruger..."
                  className="w-full rounded-full border border-stone-300 bg-white py-3 pl-11 pr-4 outline-none transition focus:border-[#0b5a47] focus:ring-4 focus:ring-[#0b5a47]/10"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <FilterButton
                  active={statusFilter === "active"}
                  label="Aktive"
                  onClick={() => setStatusFilter("active")}
                />
                <FilterButton
                  active={statusFilter === "waiting"}
                  label="Afventer"
                  onClick={() => setStatusFilter("waiting")}
                />
                <FilterButton
                  active={statusFilter === "resolved"}
                  label="Afsluttede"
                  onClick={() => setStatusFilter("resolved")}
                />
                <FilterButton
                  active={statusFilter === "all"}
                  label="Alle"
                  onClick={() => setStatusFilter("all")}
                />
              </div>
            </div>
          </div>

          {filteredDisputes.length === 0 ? (
            <section className="mt-7 rounded-[28px] border border-[#e7e1d7] bg-white p-10 text-center shadow-sm">
              <CheckCircle2 className="mx-auto h-11 w-11 text-[#0b5a47]" />

              <h2 className="mt-4 font-serif text-2xl font-bold text-[#063f32]">
                Ingen tvister i denne visning
              </h2>

              <p className="mt-2 text-stone-500">
                Prøv et andet filter eller en anden søgning.
              </p>
            </section>
          ) : (
            <div className="mt-7 space-y-4">
              {filteredDisputes.map((dispute) => (
                <DisputeCard
                  key={dispute.id}
                  dispute={dispute}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function DisputeCard({
  dispute,
}: {
  dispute: DisputeView;
}) {
  return (
    <article className="overflow-hidden rounded-[26px] border border-[#e7e1d7] bg-white shadow-sm">
      <div className="p-5 md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={dispute.status} />

              <span className="text-sm text-stone-500">
                {formatDate(dispute.created_at)}
              </span>
            </div>

            <h2 className="mt-4 break-words font-serif text-2xl font-bold text-[#063f32]">
              {dispute.subject}
            </h2>

            <p className="mt-2 text-sm font-medium text-[#8a6c13]">
              {REASON_LABELS[dispute.reason]}
            </p>

            <p className="mt-3 line-clamp-2 max-w-3xl text-sm leading-6 text-stone-600">
              {dispute.description}
            </p>
          </div>

          <div className="shrink-0 text-left lg:text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
              Ordretotal
            </p>

            <p className="mt-1 font-serif text-2xl text-[#063f32]">
              {formatMoney(dispute.orderTotal)}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 rounded-2xl bg-[#fbfaf7] p-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetaItem
            label="Køber"
            value={dispute.buyerName}
          />
          <MetaItem
            label="Sælger"
            value={dispute.sellerName}
          />
          <MetaItem
            label="Betaling"
            value={dispute.paymentStatus}
          />
          <MetaItem
            label="Udbetaling"
            value={dispute.payoutStatus}
          />
        </div>

        {dispute.resolution_error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Økonomisk fejl: {dispute.resolution_error}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="font-mono text-xs text-stone-400">
            Sag {dispute.id.slice(0, 8).toUpperCase()} · Ordre{" "}
            {dispute.order_id.slice(0, 8).toUpperCase()}
          </div>

          <Link
            href={`/admin/tvister/${dispute.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#d4af37] px-5 py-2.5 text-sm font-semibold text-[#063f32] transition hover:bg-[#e1c05a]"
          >
            Åbn sag
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-[#e7e1d7] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-stone-500">
            {label}
          </p>

          <p className="mt-2 font-serif text-3xl font-bold text-[#063f32]">
            {value}
          </p>
        </div>

        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#edf5f0] text-[#0b5a47]">
          {icon}
        </span>
      </div>
    </div>
  );
}

function FilterButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
        active
          ? "border-[#0b5a47] bg-[#0b5a47] text-white"
          : "border-stone-300 bg-white text-stone-600 hover:border-[#0b5a47] hover:text-[#0b5a47]"
      }`}
    >
      <Filter className="h-4 w-4" />
      {label}
    </button>
  );
}

function StatusBadge({
  status,
}: {
  status: DisputeStatus;
}) {
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
      className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${styles[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function MetaItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-400">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-semibold text-[#063f32]">
        {value}
      </p>
    </div>
  );
}

function formatProfileName(profile: ProfileRow) {
  if (profile.full_name?.trim()) {
    return profile.full_name.trim();
  }

  if (profile.username?.trim()) {
    return `@${profile.username.trim()}`;
  }

  return "Ukendt bruger";
}

function formatMoney(value: number) {
  return `${value.toLocaleString("da-DK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} kr.`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("da-DK", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}