"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AlertCircle,
  Camera,
  ExternalLink,
  FileVideo2,
  ImageIcon,
  Loader2,
  Paperclip,
  Plus,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type EvidenceStage =
  | "seller_item_before_packing"
  | "seller_item_in_packaging"
  | "seller_sealed_package"
  | "seller_shipping_label"
  | "buyer_package_on_arrival"
  | "buyer_unboxing"
  | "buyer_item_on_arrival"
  | "buyer_return_item"
  | "buyer_return_packaging"
  | "buyer_return_sealed_package"
  | "seller_return_package_received"
  | "seller_return_item_received";

type EvidenceRow = {
  id: string;
  order_id: string;
  dispute_id: string | null;
  uploaded_by: string;
  evidence_stage: EvidenceStage;
  storage_path: string;
  file_name: string;
  content_type: string;
  file_size: number;
  description: string | null;
  created_at: string;
};

type DisputeRow = {
  id: string;
  created_at: string;
  status: string;
};

type EvidenceItem = EvidenceRow & {
  signedUrl: string | null;
};

type OrderEvidenceSectionProps = {
  orderId: string;
  currentUserId?: string | null;
  title?: string;
  description?: string;
  showAddButton?: boolean;
  addButtonLabel?: string;
  onAddEvidence?: () => void;
  className?: string;
};

const STAGE_LABELS: Record<EvidenceStage, string> = {
  seller_item_before_packing: "Varen før indpakning",
  seller_item_in_packaging: "Varen i emballagen",
  seller_sealed_package: "Den lukkede pakke",
  seller_shipping_label: "Pakkelabel",
  buyer_package_on_arrival: "Pakken ved modtagelse",
  buyer_unboxing: "Udpakning",
  buyer_item_on_arrival: "Varen ved modtagelse",
  buyer_return_item: "Varen før retur",
  buyer_return_packaging: "Returindpakning",
  buyer_return_sealed_package: "Den lukkede returpakke",
  seller_return_package_received: "Returpakken ved modtagelse",
  seller_return_item_received: "Returvaren ved modtagelse",
};

const STAGE_GROUPS: Array<{
  title: string;
  stages: EvidenceStage[];
}> = [
  {
    title: "Afsendelse",
    stages: [
      "seller_item_before_packing",
      "seller_item_in_packaging",
      "seller_sealed_package",
      "seller_shipping_label",
    ],
  },
  {
    title: "Modtagelse",
    stages: [
      "buyer_package_on_arrival",
      "buyer_unboxing",
      "buyer_item_on_arrival",
    ],
  },
  {
    title: "Retur",
    stages: [
      "buyer_return_item",
      "buyer_return_packaging",
      "buyer_return_sealed_package",
      "seller_return_package_received",
      "seller_return_item_received",
    ],
  },
];

export default function OrderEvidenceSection({
  orderId,
  currentUserId = null,
  title = "Dokumentation",
  description =
    "Se billeder og videoer, der er uploadet i forbindelse med handlen.",
  showAddButton = true,
  addButtonLabel = "Tilføj dokumentation",
  onAddEvidence,
  className = "",
}: OrderEvidenceSectionProps) {
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [dispute, setDispute] = useState<DisputeRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedItem, setSelectedItem] =
    useState<EvidenceItem | null>(null);

  const loadEvidence = useCallback(
    async (options?: { silent?: boolean }) => {
      try {
        if (options?.silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setErrorMessage("");

        const [evidenceResult, disputeResult] = await Promise.all([
          supabase
            .from("order_evidence")
            .select(`
              id,
              order_id,
              dispute_id,
              uploaded_by,
              evidence_stage,
              storage_path,
              file_name,
              content_type,
              file_size,
              description,
              created_at
            `)
            .eq("order_id", orderId)
            .order("created_at", { ascending: true }),

          supabase
            .from("disputes")
            .select("id, created_at, status")
            .eq("order_id", orderId)
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle(),
        ]);

        if (evidenceResult.error) {
          throw evidenceResult.error;
        }

        if (disputeResult.error) {
          throw disputeResult.error;
        }

        const rows = (evidenceResult.data ?? []) as EvidenceRow[];

        const signedItems = await Promise.all(
          rows.map(async (item): Promise<EvidenceItem> => {
            const { data, error } = await supabase.storage
              .from("order-evidence")
              .createSignedUrl(item.storage_path, 60 * 30);

            if (error) {
              console.error(
                "Kunne ikke oprette signed URL til dokumentation:",
                {
                  evidenceId: item.id,
                  storagePath: item.storage_path,
                  error,
                },
              );
            }

            return {
              ...item,
              signedUrl: data?.signedUrl ?? null,
            };
          }),
        );

        setEvidence(signedItems);
        setDispute((disputeResult.data as DisputeRow | null) ?? null);
      } catch (error) {
        console.error("Dokumentationen kunne ikke hentes:", error);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Dokumentationen kunne ikke hentes.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orderId],
  );

  useEffect(() => {
    void loadEvidence();
  }, [loadEvidence]);

  const disputeCreatedAt = dispute
    ? new Date(dispute.created_at).getTime()
    : null;

  const beforeDispute = useMemo(
    () =>
      disputeCreatedAt === null
        ? evidence
        : evidence.filter(
            (item) =>
              new Date(item.created_at).getTime() < disputeCreatedAt,
          ),
    [disputeCreatedAt, evidence],
  );

  const afterDispute = useMemo(
    () =>
      disputeCreatedAt === null
        ? []
        : evidence.filter(
            (item) =>
              new Date(item.created_at).getTime() >= disputeCreatedAt,
          ),
    [disputeCreatedAt, evidence],
  );

  if (loading) {
    return (
      <section
        className={`rounded-[28px] border border-[#eadfcb] bg-white p-6 shadow-sm ${className}`}
      >
        <div className="flex min-h-40 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-[#063f32]" />
        </div>
      </section>
    );
  }

  return (
    <>
      <section
        className={`rounded-[28px] border border-[#eadfcb] bg-white p-5 shadow-sm md:p-7 ${className}`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[#edf5f0] text-[#0b5a47]">
              <Camera className="h-5 w-5" />
            </span>

            <div>
              <h2 className="font-serif text-2xl text-[#063f32]">
                {title}
              </h2>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-stone-600">
                {description}
              </p>

              <p className="mt-2 text-sm font-medium text-[#063f32]">
                {evidence.length}{" "}
                {evidence.length === 1 ? "fil" : "filer"} uploadet
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => void loadEvidence({ silent: true })}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#d9cfbd] px-4 py-2.5 text-sm font-semibold text-[#063f32] transition hover:bg-[#fbfaf7] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing ? "animate-spin" : ""
                }`}
              />
              Opdater
            </button>

            {showAddButton && onAddEvidence && (
              <button
                type="button"
                onClick={onAddEvidence}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#d4af37] px-5 py-2.5 text-sm font-semibold text-[#063f32] transition hover:bg-[#e1c05a]"
              >
                <Plus className="h-4 w-4" />
                {addButtonLabel}
              </button>
            )}
          </div>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 flex-none" />
            <p>{errorMessage}</p>
          </div>
        )}

        {evidence.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-[#d9cfbd] bg-[#fbfaf7] px-5 py-9 text-center">
            <Paperclip className="mx-auto h-7 w-7 text-stone-400" />

            <p className="mt-3 font-semibold text-[#063f32]">
              Der er endnu ingen dokumentation
            </p>

            <p className="mt-2 text-sm leading-6 text-stone-500">
              Uploadede billeder og videoer bliver vist her med
              tidspunkt og dokumentationstrin.
            </p>
          </div>
        ) : dispute ? (
          <div className="mt-7 space-y-8">
            <EvidenceGroup
              title="Dokumentation før tvisten"
              items={beforeDispute}
              currentUserId={currentUserId}
              onSelect={setSelectedItem}
            />

            <div className="border-t border-[#eadfcb]" />

            <EvidenceGroup
              title="Dokumentation efter tvisten"
              items={afterDispute}
              currentUserId={currentUserId}
              onSelect={setSelectedItem}
              emptyText="Der er endnu ikke uploadet ny dokumentation efter tvistens oprettelse."
            />
          </div>
        ) : (
          <div className="mt-7 space-y-8">
            {STAGE_GROUPS.map((group) => {
              const items = evidence.filter((item) =>
                group.stages.includes(item.evidence_stage),
              );

              if (items.length === 0) {
                return null;
              }

              return (
                <EvidenceGroup
                  key={group.title}
                  title={group.title}
                  items={items}
                  currentUserId={currentUserId}
                  onSelect={setSelectedItem}
                />
              );
            })}
          </div>
        )}

        {dispute && (
          <div className="mt-7 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 flex-none text-amber-700" />

            <p className="text-sm leading-6 text-amber-900">
              Dokumentation kan fortsat tilføjes under tvisten. Alle filer
              bevarer deres oprindelige uploadtidspunkt og kan ikke ændres
              eller slettes fra denne oversigt.
            </p>
          </div>
        )}
      </section>

      {selectedItem && (
        <EvidencePreviewModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </>
  );
}

function EvidenceGroup({
  title,
  items,
  currentUserId,
  onSelect,
  emptyText = "Der er ingen filer i denne gruppe.",
}: {
  title: string;
  items: EvidenceItem[];
  currentUserId: string | null;
  onSelect: (item: EvidenceItem) => void;
  emptyText?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h3 className="font-serif text-xl text-[#063f32]">
          {title}
        </h3>

        <span className="text-sm text-stone-500">
          {items.length} {items.length === 1 ? "fil" : "filer"}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500">
          {emptyText}
        </p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <EvidenceCard
              key={item.id}
              item={item}
              uploadedByCurrentUser={
                Boolean(currentUserId) &&
                item.uploaded_by === currentUserId
              }
              onSelect={() => onSelect(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EvidenceCard({
  item,
  uploadedByCurrentUser,
  onSelect,
}: {
  item: EvidenceItem;
  uploadedByCurrentUser: boolean;
  onSelect: () => void;
}) {
  const isVideo = item.content_type.startsWith("video/");
  const isImage = item.content_type.startsWith("image/");

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!item.signedUrl}
      className="overflow-hidden rounded-2xl border border-[#eadfcb] bg-[#fbfaf7] text-left transition hover:border-[#d4af37] hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[#eee8dc]">
        {item.signedUrl && isImage ? (
          <img
            src={item.signedUrl}
            alt={STAGE_LABELS[item.evidence_stage]}
            className="h-full w-full object-cover"
          />
        ) : item.signedUrl && isVideo ? (
          <video
            src={item.signedUrl}
            className="h-full w-full object-cover"
            muted
            playsInline
            preload="metadata"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            {isVideo ? (
              <FileVideo2 className="h-9 w-9 text-stone-400" />
            ) : (
              <ImageIcon className="h-9 w-9 text-stone-400" />
            )}
          </div>
        )}

        <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#063f32] shadow-sm">
          {isVideo ? (
            <FileVideo2 className="h-4 w-4" />
          ) : (
            <ImageIcon className="h-4 w-4" />
          )}
        </span>
      </div>

      <div className="p-4">
        <p className="font-semibold text-[#063f32]">
          {STAGE_LABELS[item.evidence_stage]}
        </p>

        <p className="mt-1 truncate text-sm text-stone-500">
          {item.file_name}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
          <span>{formatDate(item.created_at)}</span>
          <span>{formatFileSize(item.file_size)}</span>

          {uploadedByCurrentUser && (
            <span className="font-semibold text-[#0b5a47]">
              Uploadet af dig
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function EvidencePreviewModal({
  item,
  onClose,
}: {
  item: EvidenceItem;
  onClose: () => void;
}) {
  const isVideo = item.content_type.startsWith("video/");
  const isImage = item.content_type.startsWith("image/");

  return (
    <div
      className="fixed inset-0 z-[180] flex items-center justify-center overflow-y-auto bg-black/70 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={STAGE_LABELS[item.evidence_stage]}
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-5xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-[#eadfcb] p-5 md:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b79a3d]">
              Dokumentation
            </p>

            <h2 className="mt-2 font-serif text-2xl text-[#063f32]">
              {STAGE_LABELS[item.evidence_stage]}
            </h2>

            <p className="mt-2 text-sm text-stone-500">
              {item.file_name} · {formatDate(item.created_at)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-stone-500 transition hover:bg-stone-100 hover:text-[#063f32]"
            aria-label="Luk dokumentation"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="bg-[#171717]">
          {item.signedUrl && isImage && (
            <img
              src={item.signedUrl}
              alt={STAGE_LABELS[item.evidence_stage]}
              className="max-h-[72vh] w-full object-contain"
            />
          )}

          {item.signedUrl && isVideo && (
            <video
              src={item.signedUrl}
              controls
              autoPlay
              playsInline
              className="max-h-[72vh] w-full"
            />
          )}

          {!item.signedUrl && (
            <div className="flex min-h-80 items-center justify-center text-white/70">
              Filen kunne ikke åbnes.
            </div>
          )}
        </div>

        <footer className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
          <div className="text-sm text-stone-500">
            {formatFileSize(item.file_size)}
          </div>

          {item.signedUrl && (
            <a
              href={item.signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#063f32] px-5 py-2.5 text-sm font-semibold text-[#063f32] transition hover:bg-[#063f32] hover:text-white"
            >
              <ExternalLink className="h-4 w-4" />
              Åbn fil i ny fane
            </a>
          )}
        </footer>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatFileSize(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} KB`;
  }

  return `${(value / (1024 * 1024)).toLocaleString("da-DK", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} MB`;
}