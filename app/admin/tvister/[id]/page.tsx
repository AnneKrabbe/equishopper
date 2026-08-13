"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileText,
  HandCoins,
  Loader2,
  MessageSquareText,
  RotateCcw,
  Save,
  Scale,
  ShieldAlert,
  UserRound,
  WalletCards,
} from "lucide-react";

import Header from "@/components/home/Header";
import OrderEvidenceSection from "@/components/orders/OrderEvidenceSection";
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

type EventType =
  | "dispute_created"
  | "message"
  | "evidence_uploaded"
  | "status_changed"
  | "admin_request"
  | "resolution"
  | "internal_note";

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
  assigned_admin_id: string | null;
  resolution_summary: string | null;
  resolution_type: string | null;
  resolution_error: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
};

type OrderRow = {
  id: string;
  total: number | string | null;
  currency: string | null;
  payment_status: string | null;
  payout_status: string | null;
  seller_payout_amount: number | null;
  payout_net_amount: number | null;
  stripe_transfer_id: string | null;
  stripe_refund_id: string | null;
  refund_status: string | null;
  refunded_amount: number | null;
};

type ProfileSummary = {
  id: string;
  full_name: string | null;
  username: string | null;
};

type DisputeEvent = {
  id: string;
  actor_id: string | null;
  event_type: EventType;
  message: string | null;
  is_internal: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
};

type AdminAction =
  | "resolve_seller"
  | "resolve_buyer"
  | "partial_refund"
  | "request_return"
  | "request_information";

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

const eventLabels: Record<EventType, string> = {
  dispute_created: "Tvist oprettet",
  message: "Besked",
  evidence_uploaded: "Dokumentation uploadet",
  status_changed: "Status ændret",
  admin_request: "Anmodning fra Equishopper",
  resolution: "Afgørelse",
  internal_note: "Intern note",
};

const CLOSED_STATUSES: DisputeStatus[] = [
  "resolved_buyer",
  "resolved_seller",
  "partially_refunded",
  "closed",
];

export default function AdminDisputeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const disputeId = params.id;

  const [dispute, setDispute] = useState<DisputeRow | null>(null);
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [profiles, setProfiles] = useState<Record<string, ProfileSummary>>({});
  const [events, setEvents] = useState<DisputeEvent[]>([]);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [savingAction, setSavingAction] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [selectedAction, setSelectedAction] =
    useState<AdminAction>("resolve_seller");
  const [resolutionSummary, setResolutionSummary] = useState("");
  const [partialRefundAmount, setPartialRefundAmount] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (disputeId) void loadDispute();
  }, [disputeId]);

  async function loadDispute() {
    try {
      setLoading(true);
      setErrorMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        router.replace(
          `/login?redirect=/admin/tvister/${encodeURIComponent(disputeId)}`,
        );
        return;
      }

      const { data: adminProfile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (adminProfile?.role !== "admin") {
        setAuthorized(false);
        setErrorMessage("Du har ikke adgang til adminområdet.");
        return;
      }

      setAuthorized(true);
      setAdminUserId(user.id);

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
          assigned_admin_id,
          resolution_summary,
          resolution_type,
          resolution_error,
          resolved_at,
          closed_at,
          created_at,
          updated_at
        `)
        .eq("id", disputeId)
        .maybeSingle();

      if (disputeError) throw disputeError;
      if (!disputeData) throw new Error("Tvisten blev ikke fundet.");

      const row = disputeData as DisputeRow;
      setDispute(row);
      setResolutionSummary(row.resolution_summary ?? "");

      const profileIds = Array.from(
        new Set(
          [
            row.buyer_id,
            row.seller_id,
            row.opened_by,
            row.assigned_admin_id,
          ].filter((value): value is string => Boolean(value)),
        ),
      );

      const [orderResult, eventResult, profileResult] =
        await Promise.all([
          supabase
            .from("orders")
            .select(`
              id,
              total,
              currency,
              payment_status,
              payout_status,
              seller_payout_amount,
              payout_net_amount,
              stripe_transfer_id,
              stripe_refund_id,
              refund_status,
              refunded_amount
            `)
            .eq("id", row.order_id)
            .maybeSingle(),

          supabase
            .from("dispute_events")
            .select(`
              id,
              actor_id,
              event_type,
              message,
              is_internal,
              metadata,
              created_at
            `)
            .eq("dispute_id", disputeId)
            .order("created_at", { ascending: true }),

          profileIds.length > 0
            ? supabase
                .from("profiles")
                .select("id, full_name, username")
                .in("id", profileIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

      if (orderResult.error) throw orderResult.error;
      if (eventResult.error) throw eventResult.error;
      if (profileResult.error) throw profileResult.error;

      setOrder((orderResult.data as OrderRow | null) ?? null);
      setEvents((eventResult.data ?? []) as DisputeEvent[]);
      setProfiles(
        Object.fromEntries(
          ((profileResult.data ?? []) as ProfileSummary[]).map(
            (person) => [person.id, person],
          ),
        ),
      );
    } catch (error) {
      console.error("Kunne ikke hente tvisten:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Tvisten kunne ikke hentes.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function submitAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!dispute || savingAction) return;

    try {
      setSavingAction(true);
      setErrorMessage("");
      setSuccessMessage("");

      if (!resolutionSummary.trim()) {
        throw new Error("Skriv en begrundelse for afgørelsen.");
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;
      if (!session) throw new Error("Du er ikke logget ind.");

      if (selectedAction === "resolve_seller") {
        const response = await fetch(
          `/api/admin/disputes/${encodeURIComponent(
            dispute.id,
          )}/resolve-seller`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              resolutionSummary: resolutionSummary.trim(),
            }),
          },
        );

        const result = (await response.json().catch(() => null)) as
          | { error?: string; message?: string }
          | null;

        if (!response.ok) {
          throw new Error(
            result?.error || "Tvisten kunne ikke afgøres til sælger.",
          );
        }

        setSuccessMessage(
          result?.message ||
            "Tvisten er afgjort til sælger, og betalingen er frigivet.",
        );
        await loadDispute();
        return;
      }

      if (selectedAction === "resolve_buyer") {
        const response = await fetch(
          `/api/admin/disputes/${encodeURIComponent(
            dispute.id,
          )}/resolve-buyer`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              resolutionSummary: resolutionSummary.trim(),
            }),
          },
        );

        const result = (await response.json().catch(() => null)) as
          | { error?: string; message?: string }
          | null;

        if (!response.ok) {
          throw new Error(
            result?.error || "Tvisten kunne ikke afgøres til køber.",
          );
        }

        setSuccessMessage(
          result?.message ||
            "Tvisten er afgjort til køber, og refunderingen er oprettet.",
        );
        await loadDispute();
        return;
      }

      if (selectedAction === "partial_refund") {
        const refundAmountOere =
          parseKronerToOere(partialRefundAmount);

        if (refundAmountOere <= 0) {
          throw new Error(
            "Refusionsbeløbet skal være større end 0 kr.",
          );
        }

        if (
          order?.seller_payout_amount &&
          refundAmountOere >= order.seller_payout_amount
        ) {
          throw new Error(
            "Beløbet skal være mindre end sælgerens oprindelige udbetaling. Brug fuld refundering i stedet.",
          );
        }

        const response = await fetch(
          `/api/admin/disputes/${encodeURIComponent(
            dispute.id,
          )}/partial-refund`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              refundAmount: refundAmountOere,
              resolutionSummary: resolutionSummary.trim(),
            }),
          },
        );

        const result = (await response.json().catch(() => null)) as
          | {
              error?: string;
              message?: string;
              refundedAmount?: number;
              sellerNetAmount?: number;
            }
          | null;

        if (!response.ok) {
          throw new Error(
            result?.error ||
              "Den delvise refundering kunne ikke gennemføres.",
          );
        }

        setSuccessMessage(
          result?.message ||
            "Den delvise refundering er gennemført.",
        );
        setPartialRefundAmount("");
        await loadDispute();
        return;
      }

      if (selectedAction === "request_information") {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) throw new Error("Du er ikke logget ind.");

        const { error: updateError } = await supabase
          .from("disputes")
          .update({
            status: "under_review",
            assigned_admin_id:
              dispute.assigned_admin_id ?? user.id,
          })
          .eq("id", dispute.id);

        if (updateError) throw updateError;

        const { error: eventError } = await supabase
          .from("dispute_events")
          .insert({
            dispute_id: dispute.id,
            actor_id: user.id,
            event_type: "admin_request",
            message: resolutionSummary.trim(),
            is_internal: false,
            metadata: {
              action: "request_information",
            },
          });

        if (eventError) throw eventError;

        setSuccessMessage("Anmodningen om flere oplysninger er sendt.");
        setResolutionSummary("");
        await loadDispute();
        return;
      }

      throw new Error(
        "Denne økonomiske handling aktiveres, når den tilhørende Stripe-serverroute er bygget.",
      );
    } catch (error) {
      console.error("Adminhandlingen kunne ikke gennemføres:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Adminhandlingen kunne ikke gennemføres.",
      );
    } finally {
      setSavingAction(false);
    }
  }

  async function addInternalNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!dispute || savingNote || !internalNote.trim()) return;

    try {
      setSavingNote(true);
      setErrorMessage("");
      setSuccessMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Du er ikke logget ind.");

      const { error } = await supabase.from("dispute_events").insert({
        dispute_id: dispute.id,
        actor_id: user.id,
        event_type: "internal_note",
        message: internalNote.trim(),
        is_internal: true,
      });

      if (error) throw error;

      setInternalNote("");
      setSuccessMessage("Den interne note er gemt.");
      await loadDispute();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Noten kunne ikke gemmes.",
      );
    } finally {
      setSavingNote(false);
    }
  }

  const timeline = useMemo(
    () =>
      [...events].sort(
        (a, b) =>
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime(),
      ),
    [events],
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

  if (!authorized || !dispute) {
    return (
      <main className="min-h-screen bg-[#f8f5ee]">
        <Header />
        <section className="mx-auto max-w-2xl px-5 pb-20 pt-36">
          <div className="rounded-[30px] border border-red-200 bg-white p-8 text-center shadow-sm">
            <ShieldAlert className="mx-auto h-12 w-12 text-red-600" />
            <h1 className="mt-5 font-serif text-3xl font-bold text-[#063f32]">
              Sagen kan ikke vises
            </h1>
            <p className="mt-3 text-stone-600">
              {errorMessage || "Du har ikke adgang til denne sag."}
            </p>
          </div>
        </section>
      </main>
    );
  }

  const buyer = profiles[dispute.buyer_id];
  const seller = profiles[dispute.seller_id];
  const isClosed = CLOSED_STATUSES.includes(dispute.status);

  return (
    <main className="min-h-screen bg-[#f8f5ee]">
      <Header />

      <section className="bg-[#063f32] px-4 pb-14 pt-32 sm:px-6 sm:pt-36 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <Link
            href="/admin/tvister"
            className="inline-flex items-center gap-2 text-sm font-semibold text-white/70 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Tilbage til tvister
          </Link>

          <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={dispute.status} />
                <span className="text-sm text-white/45">
                  Oprettet {formatDate(dispute.created_at)}
                </span>
              </div>

              <h1 className="mt-4 font-serif text-4xl font-bold text-white sm:text-5xl">
                {dispute.subject}
              </h1>

              <p className="mt-4 text-white/65">
                {reasonLabels[dispute.reason]}
              </p>
            </div>

            <div className="font-mono text-xs text-white/45">
              Sag: {dispute.id}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-7xl gap-7 xl:grid-cols-[minmax(0,1fr)_410px]">
          <div className="space-y-7">
            {errorMessage && (
              <AlertBox type="error" message={errorMessage} />
            )}

            {successMessage && (
              <AlertBox type="success" message={successMessage} />
            )}

            <section className="rounded-[28px] border border-[#e7e1d7] bg-white p-6 shadow-sm">
              <h2 className="font-serif text-2xl font-bold text-[#063f32]">
                Sag og økonomi
              </h2>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <InfoCard
                  label="Køber"
                  value={formatProfileName(buyer)}
                  icon={<UserRound className="h-5 w-5" />}
                />
                <InfoCard
                  label="Sælger"
                  value={formatProfileName(seller)}
                  icon={<UserRound className="h-5 w-5" />}
                />
                <InfoCard
                  label="Ordre"
                  value={dispute.order_id}
                  icon={<FileText className="h-5 w-5" />}
                  mono
                />
                <InfoCard
                  label="Betaling"
                  value={order?.payment_status ?? "Ukendt"}
                  icon={<WalletCards className="h-5 w-5" />}
                />
                <InfoCard
                  label="Udbetaling"
                  value={order?.payout_status ?? "Ukendt"}
                  icon={<HandCoins className="h-5 w-5" />}
                />
                <InfoCard
                  label="Ordretotal"
                  value={formatMoney(order?.total)}
                  icon={<Scale className="h-5 w-5" />}
                />
              </div>

              <div className="mt-6 rounded-2xl bg-[#fbfaf7] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b79a3d]">
                  Beskrivelse
                </p>
                <p className="mt-3 whitespace-pre-wrap leading-7 text-stone-700">
                  {dispute.description}
                </p>
              </div>

              {dispute.resolution_error && (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  Seneste økonomiske fejl: {dispute.resolution_error}
                </div>
              )}
            </section>

            <OrderEvidenceSection
              orderId={dispute.order_id}
              currentUserId={adminUserId}
              title="Dokumentation"
              description="Dokumentation fra afsendelse, modtagelse og tvistens forløb."
              showAddButton={false}
            />

            <section className="rounded-[28px] border border-[#e7e1d7] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-2xl font-bold text-[#063f32]">
                    Tidslinje
                  </h2>
                  <p className="mt-1 text-sm text-stone-500">
                    Offentlige hændelser og interne noter.
                  </p>
                </div>
                <MessageSquareText className="h-6 w-6 text-[#0b5a47]" />
              </div>

              <div className="mt-7 space-y-6">
                {timeline.map((item) => (
                  <TimelineItem
                    key={item.id}
                    event={item}
                    actor={
                      item.actor_id
                        ? profiles[item.actor_id]
                        : undefined
                    }
                  />
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-7 xl:sticky xl:top-28 xl:self-start">
            <form
              onSubmit={submitAction}
              className="rounded-[28px] border border-[#d8c98f] bg-[#fffdf7] p-6 shadow-sm"
            >
              <h2 className="font-serif text-2xl font-bold text-[#063f32]">
                Afgør eller fortsæt sagen
              </h2>

              {isClosed ? (
                <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-700" />
                    <div>
                      <p className="font-semibold text-emerald-900">
                        Sagen er afsluttet
                      </p>
                      <p className="mt-1 text-sm leading-6 text-emerald-800">
                        {dispute.resolution_summary ||
                          statusLabels[dispute.status]}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mt-5 space-y-3">
                    <ActionOption
                      selected={selectedAction === "resolve_seller"}
                      title="Sælger får medhold"
                      description="Ingen refundering. Den tilbageholdte betaling frigives til sælger."
                      icon={<HandCoins className="h-5 w-5" />}
                      onClick={() =>
                        setSelectedAction("resolve_seller")
                      }
                    />

                    <ActionOption
                      selected={selectedAction === "request_information"}
                      title="Bed om flere oplysninger"
                      description="Sagen forbliver åben, og beskeden tilføjes til tidslinjen."
                      icon={<MessageSquareText className="h-5 w-5" />}
                      onClick={() =>
                        setSelectedAction("request_information")
                      }
                    />

                    <ActionOption
                      selected={selectedAction === "resolve_buyer"}
                      title="Køber får medhold"
                      description="Hele det resterende beløb refunderes til køber. Sælger modtager ingen udbetaling."
                      icon={<RotateCcw className="h-5 w-5" />}
                      onClick={() =>
                        setSelectedAction("resolve_buyer")
                      }
                    />

                    <ActionOption
                      selected={selectedAction === "partial_refund"}
                      title="Delvis refundering"
                      description="Køber refunderes med det valgte beløb. Resten, minus eventuelle reguleringer, frigives til sælger."
                      icon={<Scale className="h-5 w-5" />}
                      onClick={() =>
                        setSelectedAction("partial_refund")
                      }
                    />

                    <ActionOption
                      selected={selectedAction === "request_return"}
                      title="Start returforløb"
                      description="Opret returlabel og afvent dokumenteret retur."
                      icon={<RotateCcw className="h-5 w-5" />}
                      onClick={() =>
                        setSelectedAction("request_return")
                      }
                      disabled
                    />
                  </div>

                  <label className="mt-5 block">
                    <span className="mb-2 block text-sm font-semibold">
                      Begrundelse eller besked
                    </span>
                    <textarea
                      value={resolutionSummary}
                      onChange={(event) =>
                        setResolutionSummary(event.target.value)
                      }
                      rows={6}
                      className="w-full rounded-2xl border border-stone-300 px-4 py-3"
                      placeholder={
                        selectedAction === "resolve_seller"
                          ? "Forklar hvorfor sælger får medhold, og hvilke konsekvenser afgørelsen har for begge parter."
                          : selectedAction === "resolve_buyer"
                            ? "Forklar hvorfor køber får medhold, at hele beløbet refunderes, og at sælger ikke modtager udbetaling."
                            : selectedAction === "partial_refund"
                              ? "Forklar hvorfor køber får en delvis refundering, og hvilke konsekvenser afgørelsen har for begge parter."
                              : "Beskriv præcist hvilke oplysninger eller hvilken dokumentation der mangler."
                      }
                    />
                  </label>

                  {selectedAction === "partial_refund" && (
                    <div className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
                      <label className="block">
                        <span className="text-sm font-semibold text-cyan-950">
                          Refundering til køber
                        </span>

                        <div className="relative mt-2">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={partialRefundAmount}
                            onChange={(event) =>
                              setPartialRefundAmount(
                                event.target.value,
                              )
                            }
                            placeholder="0,00"
                            className="w-full rounded-2xl border border-cyan-200 bg-white px-4 py-3 pr-12 outline-none focus:border-cyan-600"
                          />

                          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-stone-400">
                            kr.
                          </span>
                        </div>
                      </label>

                      <div className="mt-4 space-y-2 rounded-2xl bg-white p-4 text-sm">
                        <AmountRow
                          label="Køber får refunderet"
                          value={formatOere(
                            safeParseKronerToOere(
                              partialRefundAmount,
                            ),
                          )}
                        />

                        <AmountRow
                          label="Sælger før evt. reguleringer"
                          value={formatOere(
                            Math.max(
                              0,
                              (order?.seller_payout_amount ?? 0) -
                                safeParseKronerToOere(
                                  partialRefundAmount,
                                ),
                            ),
                          )}
                          strong
                        />
                      </div>

                      <p className="mt-3 text-xs leading-5 text-cyan-900">
                        Den endelige sælgerudbetaling kan blive lavere,
                        hvis sælgeren har ventende reguleringer, fx en
                        returlabel fra en tidligere sag.
                      </p>
                    </div>
                  )}

                  {selectedAction === "resolve_seller" && (
                    <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
                      <p className="font-semibold">
                        Denne handling gennemfører:
                      </p>
                      <p className="mt-2">
                        Ingen refundering · tvisten afsluttes til sælger ·
                        eventuelle sælgerreguleringer modregnes · restbeløbet
                        frigives via Stripe.
                      </p>
                    </div>
                  )}

                  {selectedAction === "resolve_buyer" && (
                    <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
                      <p className="font-semibold">
                        Denne handling gennemfører:
                      </p>
                      <p className="mt-2">
                        Fuld Stripe-refundering · tvisten afsluttes til køber ·
                        sælger modtager ingen udbetaling. Handlingen afvises,
                        hvis betalingen allerede er frigivet til sælger.
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={savingAction}
                    className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#d4af37] px-6 py-3.5 font-semibold text-[#063f32] disabled:opacity-50"
                  >
                    {savingAction ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Save className="h-5 w-5" />
                    )}
                    {savingAction
                      ? "Behandler..."
                      : selectedAction === "resolve_seller"
                        ? "Afgør til sælger"
                        : selectedAction === "resolve_buyer"
                          ? "Refundér og afgør til køber"
                          : selectedAction === "partial_refund"
                            ? "Udfør delvis refundering"
                            : "Send anmodning"}
                  </button>
                </>
              )}
            </form>

            <form
              onSubmit={addInternalNote}
              className="rounded-[28px] border border-[#e7e1d7] bg-white p-6 shadow-sm"
            >
              <h2 className="font-serif text-xl font-bold text-[#063f32]">
                Intern note
              </h2>
              <p className="mt-1 text-xs text-stone-500">
                Kun synlig for administratorer.
              </p>

              <textarea
                value={internalNote}
                onChange={(event) =>
                  setInternalNote(event.target.value)
                }
                rows={5}
                className="mt-4 w-full rounded-2xl border border-stone-300 px-4 py-3"
              />

              <button
                type="submit"
                disabled={savingNote || !internalNote.trim()}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#063f32] px-6 py-3 font-semibold text-[#063f32] disabled:opacity-50"
              >
                {savingNote && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Gem intern note
              </button>
            </form>
          </aside>
        </div>
      </section>
    </main>
  );
}

function ActionOption({
  selected,
  title,
  description,
  icon,
  onClick,
  disabled = false,
}: {
  selected: boolean;
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-2xl border p-4 text-left ${
        selected
          ? "border-[#0b5a47] bg-[#edf5f0]"
          : "border-stone-200 bg-white"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white text-[#0b5a47] shadow-sm">
          {icon}
        </span>
        <div>
          <p className="font-semibold text-[#063f32]">
            {title}
          </p>
          <p className="mt-1 text-sm leading-5 text-stone-500">
            {description}
          </p>
          {disabled && (
            <p className="mt-2 text-xs font-semibold text-amber-700">
              Aktiveres med næste Stripe-serverroute
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

function AlertBox({
  type,
  message,
}: {
  type: "error" | "success";
  message: string;
}) {
  const isError = type === "error";

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${
        isError
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-800"
      }`}
    >
      {isError ? (
        <AlertCircle className="h-5 w-5 flex-none" />
      ) : (
        <CheckCircle2 className="h-5 w-5 flex-none" />
      )}
      <p>{message}</p>
    </div>
  );
}

function InfoCard({
  label,
  value,
  icon,
  mono = false,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[#eadfcb] p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#f0f5f1] text-[#0b5a47]">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
            {label}
          </p>
          <p
            className={`mt-1 break-all text-sm font-semibold text-[#063f32] ${
              mono ? "font-mono text-xs" : ""
            }`}
          >
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function TimelineItem({
  event,
  actor,
}: {
  event: DisputeEvent;
  actor?: ProfileSummary;
}) {
  const resolutionLabel =
    event.event_type === "resolution"
      ? getResolutionLabel(event.metadata)
      : null;

  return (
    <article className="relative pl-8">
      <span
        className={`absolute left-0 top-1.5 h-3 w-3 rounded-full ${
          event.is_internal ? "bg-[#d4af37]" : "bg-[#0b5a47]"
        }`}
      />
      <div className="absolute bottom-[-24px] left-[5px] top-5 w-px bg-[#e7e1d7]" />

      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold text-[#063f32]">
          {eventLabels[event.event_type]}
        </p>

        {resolutionLabel && (
          <span className="rounded-full bg-[#edf5f0] px-2.5 py-1 text-xs font-semibold text-[#0b5a47]">
            {resolutionLabel}
          </span>
        )}

        {event.is_internal && (
          <span className="rounded-full bg-[#fbf6e8] px-2.5 py-1 text-xs font-semibold text-[#8a6c13]">
            Intern
          </span>
        )}

        <span className="text-xs text-stone-400">
          {formatDate(event.created_at)}
        </span>
      </div>

      <p className="mt-1 text-xs text-stone-500">
        {formatProfileName(actor)}
      </p>

      {event.event_type === "resolution" && resolutionLabel && (
        <div className="mt-3 rounded-2xl border border-[#d8e8df] bg-[#f3f8f5] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0b5a47]">
            Afgørelse
          </p>
          <p className="mt-1 font-semibold text-[#063f32]">
            {resolutionLabel}
          </p>

          {event.message && (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-700">
              {event.message}
            </p>
          )}
        </div>
      )}

      {event.event_type !== "resolution" && event.message && (
        <p className="mt-3 whitespace-pre-wrap rounded-2xl bg-[#fbfaf7] p-4 text-sm leading-6 text-stone-700">
          {event.message}
        </p>
      )}
    </article>
  );
}

function getResolutionLabel(metadata: Record<string, unknown>) {
  const rawValue =
    metadata?.resolution_type ??
    metadata?.resolutionType ??
    metadata?.action ??
    metadata?.status ??
    metadata?.result;

  const value =
    typeof rawValue === "string"
      ? rawValue.trim().toLowerCase()
      : "";

  switch (value) {
    case "resolve_seller":
    case "resolved_seller":
    case "seller":
    case "seller_wins":
      return "Sælger får medhold";

    case "resolve_buyer":
    case "resolved_buyer":
    case "buyer":
    case "buyer_wins":
      return "Køber får medhold";

    case "partial_refund":
    case "partially_refunded":
    case "partial-refund":
      return "Delvis refundering";

    case "request_return":
    case "return":
      return "Returforløb";

    default:
      return null;
  }
}

function StatusBadge({ status }: { status: DisputeStatus }) {
  return (
    <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white">
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

function AmountRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 ${
        strong
          ? "font-semibold text-[#063f32]"
          : "text-stone-600"
      }`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function parseKronerToOere(value: string) {
  const normalized = value
    .trim()
    .replace(/\s/g, "")
    .replace(",", ".");

  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Refusionsbeløbet er ugyldigt.");
  }

  return Math.round(amount * 100);
}

function safeParseKronerToOere(value: string) {
  try {
    return parseKronerToOere(value);
  } catch {
    return 0;
  }
}

function formatOere(value: number) {
  return `${(value / 100).toLocaleString("da-DK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} kr.`;
}

function formatMoney(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return `${amount.toLocaleString("da-DK", {
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