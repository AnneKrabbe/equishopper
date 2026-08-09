"use client";

import Link from "next/link";
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  FileText,
  ImagePlus,
  Loader2,
  MessageSquareText,
  Paperclip,
  Send,
  ShieldCheck,
  Trash2,
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

type EventType =
  | "dispute_created"
  | "message"
  | "evidence_uploaded"
  | "status_changed"
  | "admin_request"
  | "resolution";

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
  resolution_summary: string | null;
  refund_amount: number | null;
  resolved_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
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
  is_internal: false;
  metadata: Record<string, unknown>;
  created_at: string;
};

type AttachmentRow = {
  id: string;
  uploaded_by: string;
  storage_path: string;
  file_name: string;
  content_type: string;
  file_size: number;
  description: string | null;
  is_internal: false;
  created_at: string;
};

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
  admin_request: "Besked fra Equishopper",
  resolution: "Afgørelse",
};

const CLOSED_STATUSES: DisputeStatus[] = [
  "resolved_buyer",
  "resolved_seller",
  "partially_refunded",
  "closed",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 6;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export default function UserDisputeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const disputeId = params.id;

  const [currentUserId, setCurrentUserId] = useState("");
  const [dispute, setDispute] = useState<DisputeRow | null>(null);
  const [profiles, setProfiles] = useState<Record<string, ProfileSummary>>({});
  const [events, setEvents] = useState<DisputeEvent[]>([]);
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>(
    {}
  );

  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (disputeId) {
      void loadDispute();
    }
  }, [disputeId]);

  async function loadDispute() {
    try {
      setLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        router.replace(
          `/login?redirect=/profil/tvister/${encodeURIComponent(disputeId)}`
        );
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
          resolution_summary,
          refund_amount,
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

      if (user.id !== row.buyer_id && user.id !== row.seller_id) {
        setAuthorized(false);
        setErrorMessage("Du har ikke adgang til denne tvist.");
        return;
      }

      setAuthorized(true);
      setDispute(row);

      const profileIds = Array.from(
        new Set([row.buyer_id, row.seller_id, row.opened_by])
      );

      const [
        { data: eventData, error: eventError },
        { data: attachmentData, error: attachmentError },
        { data: profileData, error: peopleError },
      ] = await Promise.all([
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
          .eq("is_internal", false)
          .order("created_at", { ascending: true }),
        supabase
          .from("dispute_attachments")
          .select(`
            id,
            uploaded_by,
            storage_path,
            file_name,
            content_type,
            file_size,
            description,
            is_internal,
            created_at
          `)
          .eq("dispute_id", disputeId)
          .eq("is_internal", false)
          .order("created_at", { ascending: true }),
        supabase
          .from("profiles")
          .select("id, full_name, username")
          .in("id", profileIds),
      ]);

      if (eventError) throw eventError;
      if (attachmentError) throw attachmentError;
      if (peopleError) throw peopleError;

      const eventRows = (eventData ?? []) as DisputeEvent[];
      const attachmentRows = (attachmentData ?? []) as AttachmentRow[];

      setEvents(eventRows);
      setAttachments(attachmentRows);
      setProfiles(
        Object.fromEntries(
          ((profileData ?? []) as ProfileSummary[]).map((person) => [
            person.id,
            person,
          ])
        )
      );

      if (attachmentRows.length > 0) {
        const urlEntries = await Promise.all(
          attachmentRows.map(async (attachment) => {
            const { data, error } = await supabase.storage
              .from("dispute-evidence")
              .createSignedUrl(attachment.storage_path, 60 * 30);

            if (error || !data?.signedUrl) {
              console.error(
                "Kunne ikke oprette link til dokumentation:",
                error
              );
              return [attachment.id, ""] as const;
            }

            return [attachment.id, data.signedUrl] as const;
          })
        );

        setAttachmentUrls(Object.fromEntries(urlEntries));
      } else {
        setAttachmentUrls({});
      }
    } catch (error) {
      console.error("Kunne ikke hente tvisten:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Tvisten kunne ikke hentes."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (selectedFiles.length === 0) return;

    setErrorMessage("");

    const combinedFiles = [...files, ...selectedFiles];

    if (combinedFiles.length > MAX_FILES) {
      setErrorMessage(`Du kan højst uploade ${MAX_FILES} filer ad gangen.`);
      return;
    }

    const invalidType = selectedFiles.find(
      (file) => !ALLOWED_TYPES.includes(file.type)
    );

    if (invalidType) {
      setErrorMessage(
        "Dokumentation skal være JPG, PNG, WebP eller PDF."
      );
      return;
    }

    const oversizedFile = selectedFiles.find(
      (file) => file.size > MAX_FILE_SIZE
    );

    if (oversizedFile) {
      setErrorMessage("Hver fil må højst fylde 10 MB.");
      return;
    }

    setFiles(combinedFiles);
  }

  function removeFile(index: number) {
    setFiles((current) =>
      current.filter((_, currentIndex) => currentIndex !== index)
    );
  }

  async function uploadEvidence(
    disputeIdValue: string,
    userId: string,
    selectedFiles: File[]
  ) {
    for (const file of selectedFiles) {
      const safeName = file.name
        .normalize("NFKD")
        .replace(/[^\w.-]+/g, "-")
        .replace(/-+/g, "-")
        .toLowerCase();

      const storagePath = `${disputeIdValue}/${userId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("dispute-evidence")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { error: attachmentError } = await supabase
        .from("dispute_attachments")
        .insert({
          dispute_id: disputeIdValue,
          uploaded_by: userId,
          storage_path: storagePath,
          file_name: file.name,
          content_type: file.type,
          file_size: file.size,
          is_internal: false,
        });

      if (attachmentError) {
        await supabase.storage
          .from("dispute-evidence")
          .remove([storagePath]);

        throw attachmentError;
      }

      const { error: eventError } = await supabase
        .from("dispute_events")
        .insert({
          dispute_id: disputeIdValue,
          actor_id: userId,
          event_type: "message",
          message: `Dokumentation uploadet: ${file.name}`,
          is_internal: false,
          metadata: {
            attachment_storage_path: storagePath,
            attachment_file_name: file.name,
          },
        });

      if (eventError) {
        console.error(
          "Dokumentationen blev uploadet, men tidslinjen kunne ikke opdateres:",
          eventError
        );
      }
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!dispute || submitting || isClosed) return;

    try {
      setSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      const trimmedMessage = message.trim();

      if (!trimmedMessage && files.length === 0) {
        throw new Error("Skriv en besked eller vedhæft dokumentation.");
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Du er ikke logget ind.");

      if (trimmedMessage) {
        const { error: messageError } = await supabase
          .from("dispute_events")
          .insert({
            dispute_id: dispute.id,
            actor_id: user.id,
            event_type: "message",
            message: trimmedMessage,
            is_internal: false,
          });

        if (messageError) throw messageError;
      }

      if (files.length > 0) {
        await uploadEvidence(dispute.id, user.id, files);
      }

      setMessage("");
      setFiles([]);
      setSuccessMessage("Dit svar er sendt.");
      await loadDispute();
    } catch (error) {
      console.error("Kunne ikke sende svar:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Svaret kunne ikke sendes."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const timeline = useMemo(
    () =>
      [...events].sort(
        (a, b) =>
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime()
      ),
    [events]
  );

  const isClosed = dispute
    ? CLOSED_STATUSES.includes(dispute.status)
    : false;

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
            <AlertTriangle className="mx-auto h-12 w-12 text-red-600" />

            <h1 className="mt-5 font-serif text-3xl font-bold text-[#063f32]">
              Sagen kan ikke vises
            </h1>

            <p className="mt-3 text-stone-600">
              {errorMessage || "Du har ikke adgang til denne sag."}
            </p>

            <Link
              href="/profil/tvister"
              className="mt-7 inline-flex rounded-full bg-[#d4af37] px-7 py-3 font-semibold text-[#063f32]"
            >
              Tilbage til tvister
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const buyer = profiles[dispute.buyer_id];
  const seller = profiles[dispute.seller_id];

  return (
    <main className="min-h-screen bg-[#f8f5ee]">
      <Header />

      <section className="bg-[#063f32] px-4 pb-14 pt-32 sm:px-6 sm:pt-36 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <Link
            href="/profil/tvister"
            className="inline-flex items-center gap-2 text-sm font-semibold text-white/70 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Tilbage til tvister
          </Link>

          <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={dispute.status} />

                <span className="text-sm text-white/45">
                  Oprettet {formatDate(dispute.created_at)}
                </span>
              </div>

              <h1 className="mt-4 break-words font-serif text-4xl font-bold text-white sm:text-5xl">
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
        <div className="mx-auto grid w-full max-w-6xl gap-7 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-7">
            {errorMessage && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                {successMessage}
              </div>
            )}

            <section className="rounded-[28px] border border-[#e7e1d7] bg-white p-6 shadow-sm">
              <h2 className="font-serif text-2xl font-bold text-[#063f32]">
                Sagens oplysninger
              </h2>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
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
                  label="Din rolle"
                  value={
                    currentUserId === dispute.buyer_id ? "Køber" : "Sælger"
                  }
                  icon={<ShieldCheck className="h-5 w-5" />}
                />

                <InfoCard
                  label="Ordre"
                  value={dispute.order_id}
                  icon={<FileText className="h-5 w-5" />}
                  mono
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
            </section>

            {dispute.resolution_summary && (
              <section className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                  Equishoppers afgørelse
                </p>

                <p className="mt-3 whitespace-pre-wrap leading-7 text-emerald-950">
                  {dispute.resolution_summary}
                </p>

                {dispute.refund_amount !== null && (
                  <p className="mt-4 font-semibold text-emerald-900">
                    Refusionsbeløb:{" "}
                    {Number(dispute.refund_amount).toLocaleString("da-DK", {
                      minimumFractionDigits:
                        dispute.refund_amount % 1 === 0 ? 0 : 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    kr.
                  </p>
                )}
              </section>
            )}

            <section className="rounded-[28px] border border-[#e7e1d7] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-serif text-2xl font-bold text-[#063f32]">
                    Tidslinje
                  </h2>
                  <p className="mt-1 text-sm text-stone-500">
                    Beskeder og hændelser i sagen.
                  </p>
                </div>

                <MessageSquareText className="h-6 w-6 text-[#0b5a47]" />
              </div>

              {timeline.length === 0 ? (
                <p className="mt-6 text-sm text-stone-500">
                  Der er endnu ingen hændelser.
                </p>
              ) : (
                <div className="mt-7 space-y-6">
                  {timeline.map((item) => (
                    <TimelineItem
                      key={item.id}
                      event={item}
                      actor={
                        item.actor_id ? profiles[item.actor_id] : undefined
                      }
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[28px] border border-[#e7e1d7] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-serif text-2xl font-bold text-[#063f32]">
                    Dokumentation
                  </h2>
                  <p className="mt-1 text-sm text-stone-500">
                    Billeder og PDF-filer knyttet til sagen.
                  </p>
                </div>

                <Paperclip className="h-6 w-6 text-[#0b5a47]" />
              </div>

              {attachments.length === 0 ? (
                <p className="mt-6 text-sm text-stone-500">
                  Der er endnu ikke uploadet dokumentation.
                </p>
              ) : (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {attachments.map((attachment) => (
                    <a
                      key={attachment.id}
                      href={attachmentUrls[attachment.id] || undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-2xl border border-[#eadfcb] p-4 transition hover:border-[#0b5a47]/40 hover:bg-[#fbfaf7]"
                    >
                      <div className="flex items-start gap-3">
                        <FileText className="mt-0.5 h-5 w-5 flex-none text-[#0b5a47]" />

                        <div className="min-w-0">
                          <p className="truncate font-semibold text-[#063f32]">
                            {attachment.file_name}
                          </p>

                          <p className="mt-1 text-xs text-stone-500">
                            {formatFileSize(attachment.file_size)}
                          </p>

                          {attachment.description && (
                            <p className="mt-2 line-clamp-2 text-sm text-stone-600">
                              {attachment.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="self-start lg:sticky lg:top-28">
            {isClosed ? (
              <section className="rounded-[28px] border border-[#e7e1d7] bg-white p-6 shadow-sm">
                <ShieldCheck className="h-7 w-7 text-[#0b5a47]" />

                <h2 className="mt-4 font-serif text-2xl font-bold text-[#063f32]">
                  Sagen er afsluttet
                </h2>

                <p className="mt-3 text-sm leading-6 text-stone-600">
                  Det er ikke længere muligt at sende nye beskeder eller
                  dokumentation i denne sag.
                </p>
              </section>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="rounded-[28px] border border-[#e7e1d7] bg-white p-6 shadow-sm"
              >
                <h2 className="font-serif text-2xl font-bold text-[#063f32]">
                  Skriv et svar
                </h2>

                <p className="mt-2 text-sm leading-6 text-stone-500">
                  Beskeden kan ses af den anden part og Equishopper.
                </p>

                <textarea
                  value={message}
                  onChange={(event) => {
                    setMessage(event.target.value);
                    setErrorMessage("");
                  }}
                  disabled={submitting}
                  rows={7}
                  placeholder="Skriv din besked..."
                  className="mt-5 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-stone-700 outline-none transition focus:border-[#0b5a47] focus:ring-4 focus:ring-[#0b5a47]/10 disabled:bg-stone-50"
                />

                <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-stone-300 px-4 py-4 text-sm font-semibold text-[#063f32] transition hover:border-[#0b5a47] hover:bg-[#fbfaf7]">
                  <ImagePlus className="h-5 w-5" />
                  Vedhæft dokumentation

                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleFiles}
                    disabled={submitting}
                    className="hidden"
                  />
                </label>

                {files.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {files.map((file, index) => (
                      <div
                        key={`${file.name}-${file.lastModified}-${index}`}
                        className="flex items-center gap-3 rounded-2xl border border-[#eadfcb] p-3"
                      >
                        <FileText className="h-4 w-4 flex-none text-[#0b5a47]" />

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#063f32]">
                            {file.name}
                          </p>

                          <p className="mt-1 text-xs text-stone-500">
                            {formatFileSize(file.size)}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          disabled={submitting}
                          aria-label={`Fjern ${file.name}`}
                          className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-stone-500 transition hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    submitting || (!message.trim() && files.length === 0)
                  }
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#d4af37] px-6 py-3.5 font-semibold text-[#063f32] transition hover:bg-[#e1c05a] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}

                  {submitting ? "Sender..." : "Send svar"}
                </button>
              </form>
            )}
          </aside>
        </div>
      </section>
    </main>
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
  return (
    <article className="relative pl-8">
      <span className="absolute left-0 top-1.5 h-3 w-3 rounded-full bg-[#0b5a47]" />

      <div className="absolute bottom-[-24px] left-[5px] top-5 w-px bg-[#e7e1d7]" />

      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold text-[#063f32]">
          {eventLabels[event.event_type]}
        </p>

        <span className="text-xs text-stone-400">
          {formatDate(event.created_at)}
        </span>
      </div>

      <p className="mt-1 text-xs text-stone-500">
        {formatProfileName(actor)}
      </p>

      {event.message && (
        <p className="mt-3 whitespace-pre-wrap rounded-2xl bg-[#fbfaf7] p-4 text-sm leading-6 text-stone-700">
          {event.message}
        </p>
      )}
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
  if (!profile) return "Equishopper";
  if (profile.full_name) return profile.full_name;
  if (profile.username) return `@${profile.username}`;
  return "Equishopper";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("da-DK", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatFileSize(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}