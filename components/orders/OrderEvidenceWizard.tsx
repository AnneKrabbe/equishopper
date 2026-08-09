"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  FileVideo2,
  Loader2,
  Package,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

export type EvidenceFlow =
  | "seller_shipping"
  | "buyer_receiving"
  | "buyer_return"
  | "seller_return_receiving";

export type EvidenceStage =
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

type EvidenceStep = {
  stage: EvidenceStage;
  title: string;
  description: string;
  videoRecommended?: boolean;
};

type SelectedEvidence = {
  id: string;
  file: File;
  previewUrl: string;
};

type UploadedEvidence = {
  id: string;
  evidence_stage: EvidenceStage;
  file_name: string;
  content_type: string;
  file_size: number;
  storage_path: string;
  created_at: string;
};

type OrderEvidenceWizardProps = {
  orderId: string;
  flow: EvidenceFlow;
  disputeId?: string | null;
  continueLabel?: string;
  allowSkip?: boolean;
  onCompleted?: (result: {
    uploaded: UploadedEvidence[];
    skipped: boolean;
  }) => void | Promise<void>;
  onCancel?: () => void;
};

const FLOW_CONTENT: Record<
  EvidenceFlow,
  {
    eyebrow: string;
    title: string;
    intro: string;
    reminder: string;
    steps: EvidenceStep[];
  }
> = {
  seller_shipping: {
    eyebrow: "Før afsendelse",
    title: "Dokumentér varen og pakken",
    intro:
      "Tag billeder eller en kort video, før pakken lukkes helt. Det kan være vigtig dokumentation, hvis der senere opstår en tvist.",
    reminder:
      "Vis varens aktuelle stand, indpakningen, den lukkede pakke og pakkelabelen så tydeligt som muligt.",
    steps: [
      {
        stage: "seller_item_before_packing",
        title: "Varen før indpakning",
        description:
          "Fotografér hele varen og eventuelle kendte brugsspor eller fejl.",
        videoRecommended: true,
      },
      {
        stage: "seller_item_in_packaging",
        title: "Varen i emballagen",
        description:
          "Vis hvordan varen er beskyttet, inden pakken lukkes.",
      },
      {
        stage: "seller_sealed_package",
        title: "Den lukkede pakke",
        description:
          "Fotografér pakken fra flere sider, efter den er lukket.",
      },
      {
        stage: "seller_shipping_label",
        title: "Pakkelabel",
        description:
          "Vis labelen og trackingoplysningerne. Undgå at dele billedet offentligt.",
      },
    ],
  },
  buyer_receiving: {
    eyebrow: "Ved modtagelse",
    title: "Dokumentér pakken før og efter åbning",
    intro:
      "Er pakken beskadiget, eller er du usikker på varens stand, bør du dokumentere den, før du åbner.",
    reminder:
      "Gem emballagen, indtil du har kontrolleret varen og eventuelle problemer er afklaret.",
    steps: [
      {
        stage: "buyer_package_on_arrival",
        title: "Pakken før åbning",
        description:
          "Fotografér alle sider og eventuelle tryk, huller eller fugtskader.",
      },
      {
        stage: "buyer_unboxing",
        title: "Udpakningen",
        description:
          "En kort, sammenhængende video kan vise, hvordan varen lå i pakken.",
        videoRecommended: true,
      },
      {
        stage: "buyer_item_on_arrival",
        title: "Varen umiddelbart efter udpakning",
        description:
          "Fotografér varen og eventuelle afvigelser fra annoncen.",
      },
    ],
  },
  buyer_return: {
    eyebrow: "Før retur",
    title: "Dokumentér returvaren",
    intro:
      "Dokumentér varens stand og indpakning, inden returpakken afleveres.",
    reminder:
      "Brug den returlabel og det trackingnummer, som Equishopper har udstedt.",
    steps: [
      {
        stage: "buyer_return_item",
        title: "Varen før retur",
        description:
          "Vis hele varen og dens stand, inden den pakkes.",
        videoRecommended: true,
      },
      {
        stage: "buyer_return_packaging",
        title: "Returindpakningen",
        description:
          "Vis hvordan varen er beskyttet i emballagen.",
      },
      {
        stage: "buyer_return_sealed_package",
        title: "Den lukkede returpakke",
        description:
          "Fotografér pakken fra flere sider og vis returlabelen.",
      },
    ],
  },
  seller_return_receiving: {
    eyebrow: "Retur modtaget",
    title: "Dokumentér returpakken",
    intro:
      "Tag billeder eller video, før pakken åbnes, og kontrollér derefter varen med det samme.",
    reminder:
      "Opstår der uenighed om varens stand efter retur, indgår denne dokumentation i sagen.",
    steps: [
      {
        stage: "seller_return_package_received",
        title: "Pakken før åbning",
        description:
          "Fotografér alle sider og eventuelle synlige transportskader.",
        videoRecommended: true,
      },
      {
        stage: "seller_return_item_received",
        title: "Varen efter udpakning",
        description:
          "Fotografér varens stand og eventuelle nye skader.",
      },
    ],
  },
};

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

export default function OrderEvidenceWizard({
  orderId,
  flow,
  disputeId = null,
  continueLabel = "Fortsæt",
  allowSkip = true,
  onCompleted,
  onCancel,
}: OrderEvidenceWizardProps) {
  const content = FLOW_CONTENT[flow];

  const [filesByStage, setFilesByStage] = useState<
    Partial<Record<EvidenceStage, SelectedEvidence[]>>
  >({});
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [skipConfirmed, setSkipConfirmed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const previewUrlsRef = useRef<string[]>([]);

  const selectedCount = useMemo(
    () =>
      Object.values(filesByStage).reduce(
        (sum, items) => sum + (items?.length ?? 0),
        0,
      ),
    [filesByStage],
  );

  const currentStep = content.steps[currentStepIndex];
  const currentFiles = filesByStage[currentStep.stage] ?? [];
  const isLastStep = currentStepIndex === content.steps.length - 1;

  useEffect(() => {
    return () => {
      for (const url of previewUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  function addFiles(
    stage: EvidenceStage,
    fileList: FileList | null,
  ) {
    if (!fileList) return;

    setErrorMessage("");

    const accepted: SelectedEvidence[] = [];

    for (const file of Array.from(fileList)) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setErrorMessage(
          "Du kan uploade JPG, PNG, WebP, HEIC, MP4, WebM eller MOV.",
        );
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        setErrorMessage(
          `${file.name} er større end 100 MB og blev ikke tilføjet.`,
        );
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      previewUrlsRef.current.push(previewUrl);

      accepted.push({
        id: crypto.randomUUID(),
        file,
        previewUrl,
      });
    }

    if (accepted.length === 0) return;

    setFilesByStage((current) => ({
      ...current,
      [stage]: [...(current[stage] ?? []), ...accepted],
    }));
    setSkipConfirmed(false);
  }

  function removeFile(stage: EvidenceStage, id: string) {
    setFilesByStage((current) => {
      const item = current[stage]?.find((candidate) => candidate.id === id);

      if (item) {
        URL.revokeObjectURL(item.previewUrl);
        previewUrlsRef.current = previewUrlsRef.current.filter(
          (url) => url !== item.previewUrl,
        );
      }

      return {
        ...current,
        [stage]: (current[stage] ?? []).filter(
          (candidate) => candidate.id !== id,
        ),
      };
    });
  }

  async function finish() {
    if (uploading) return;

    if (selectedCount === 0 && !skipConfirmed) {
      setErrorMessage(
        "Upload dokumentation, eller markér at du ønsker at fortsætte uden.",
      );
      return;
    }

    try {
      setUploading(true);
      setErrorMessage("");

      if (selectedCount === 0) {
        await onCompleted?.({
          uploaded: [],
          skipped: true,
        });
        return;
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;
      if (!session) throw new Error("Du skal være logget ind.");

      const uploaded: UploadedEvidence[] = [];
      let uploadedCount = 0;

      for (const step of content.steps) {
        const selected = filesByStage[step.stage] ?? [];

        for (const item of selected) {
          uploadedCount += 1;
          setUploadProgress(
            `Uploader fil ${uploadedCount} af ${selectedCount}…`,
          );

          const formData = new FormData();
          formData.append("file", item.file);
          formData.append("evidenceStage", step.stage);

          if (disputeId) {
            formData.append("disputeId", disputeId);
          }

          const response = await fetch(
            `/api/orders/${encodeURIComponent(orderId)}/evidence`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
              body: formData,
            },
          );

          const result = (await response.json().catch(() => null)) as
            | {
                evidence?: UploadedEvidence;
                error?: string;
              }
            | null;

          if (!response.ok || !result?.evidence) {
            throw new Error(
              result?.error || `${item.file.name} kunne ikke uploades.`,
            );
          }

          uploaded.push(result.evidence);
        }
      }

      await onCompleted?.({
        uploaded,
        skipped: false,
      });
    } catch (error) {
      console.error("Dokumentationen kunne ikke uploades:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Dokumentationen kunne ikke uploades.",
      );
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  }

  return (
    <section className="overflow-hidden rounded-[30px] border border-[#e7e1d7] bg-white shadow-[0_24px_80px_rgba(35,45,40,0.12)]">
      <header className="border-b border-[#eadfcb] bg-[#fbfaf7] p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#edf4ef] text-[#063f32]">
            <ShieldCheck className="h-6 w-6" />
          </span>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#b79a3d]">
              {content.eyebrow}
            </p>
            <h2 className="mt-2 font-serif text-3xl font-bold text-[#063f32]">
              {content.title}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
              {content.intro}
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {content.steps.map((step, index) => {
            const completed = (filesByStage[step.stage]?.length ?? 0) > 0;
            const active = index === currentStepIndex;

            return (
              <button
                key={step.stage}
                type="button"
                onClick={() => setCurrentStepIndex(index)}
                disabled={uploading}
                className={`rounded-2xl border px-3 py-3 text-left transition ${
                  active
                    ? "border-[#0b5a47] bg-[#edf5f0]"
                    : completed
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-stone-200 bg-white"
                }`}
              >
                <span className="flex items-center gap-2">
                  {completed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  ) : (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold text-stone-500">
                      {index + 1}
                    </span>
                  )}
                  <span className="text-xs font-semibold text-[#063f32]">
                    Trin {index + 1}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </header>

      <div className="p-6 sm:p-8">
        <div className="rounded-2xl border border-[#eadfcb] bg-[#fbfaf7] p-5">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#0b5a47] shadow-sm">
              {currentStep.videoRecommended ? (
                <FileVideo2 className="h-5 w-5" />
              ) : (
                <Camera className="h-5 w-5" />
              )}
            </span>

            <div>
              <p className="text-sm font-semibold text-[#b79a3d]">
                Trin {currentStepIndex + 1} af {content.steps.length}
              </p>
              <h3 className="mt-1 font-serif text-2xl font-bold text-[#063f32]">
                {currentStep.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                {currentStep.description}
              </p>
            </div>
          </div>

          <label className="mt-5 flex cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed border-[#b79a3d] bg-white px-5 py-6 text-center transition hover:bg-[#fffdf7]">
            <Upload className="h-5 w-5 text-[#0b5a47]" />
            <span>
              <span className="block font-semibold text-[#063f32]">
                Vælg billeder eller video
              </span>
              <span className="mt-1 block text-xs text-stone-500">
                Maks. 100 MB pr. fil
              </span>
            </span>

            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/webm,video/quicktime"
              className="hidden"
              disabled={uploading}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                addFiles(currentStep.stage, event.target.files);
                event.currentTarget.value = "";
              }}
            />
          </label>

          {currentFiles.length > 0 && (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {currentFiles.map((item) => {
                const isVideo = item.file.type.startsWith("video/");

                return (
                  <article
                    key={item.id}
                    className="overflow-hidden rounded-2xl border border-[#eadfcb] bg-white"
                  >
                    <div className="aspect-square bg-stone-100">
                      {isVideo ? (
                        <video
                          src={item.previewUrl}
                          className="h-full w-full object-cover"
                          controls
                          preload="metadata"
                        />
                      ) : (
                        <img
                          src={item.previewUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 p-3">
                      <p className="min-w-0 truncate text-xs text-stone-600">
                        {item.file.name}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          removeFile(currentStep.stage, item.id)
                        }
                        disabled={uploading}
                        className="rounded-full p-2 text-red-600 transition hover:bg-red-50"
                        aria-label="Fjern fil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <Package className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <p className="text-sm leading-6 text-amber-900">
            {content.reminder}
          </p>
        </div>

        {allowSkip && (
          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-stone-200 p-4">
            <input
              type="checkbox"
              checked={skipConfirmed}
              disabled={uploading || selectedCount > 0}
              onChange={(event) =>
                setSkipConfirmed(event.target.checked)
              }
              className="mt-1"
            />
            <span>
              <span className="block font-semibold text-[#063f32]">
                Fortsæt uden dokumentation
              </span>
              <span className="mt-1 block text-sm leading-6 text-stone-500">
                Det er frivilligt at uploade, men manglende dokumentation
                kan gøre det sværere at fastslå varens eller pakkens stand
                ved en eventuel tvist.
              </span>
            </span>
          </label>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        {uploadProgress && (
          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-[#edf5f0] p-4 text-sm text-[#063f32]">
            <Loader2 className="h-5 w-5 animate-spin" />
            {uploadProgress}
          </div>
        )}

        <footer className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={uploading}
                className="rounded-full border border-stone-300 px-6 py-3 font-semibold text-stone-700"
              >
                Annuller
              </button>
            )}

            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={() =>
                  setCurrentStepIndex((current) => current - 1)
                }
                disabled={uploading}
                className="rounded-full border border-[#063f32] px-6 py-3 font-semibold text-[#063f32]"
              >
                Forrige
              </button>
            )}
          </div>

          {!isLastStep ? (
            <button
              type="button"
              onClick={() =>
                setCurrentStepIndex((current) => current + 1)
              }
              disabled={uploading}
              className="rounded-full bg-[#063f32] px-7 py-3 font-semibold text-white"
            >
              Næste trin
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void finish()}
              disabled={
                uploading ||
                (selectedCount === 0 && !skipConfirmed)
              }
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#d4af37] px-7 py-3 font-semibold text-[#063f32] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading && (
                <Loader2 className="h-5 w-5 animate-spin" />
              )}
              {uploading ? "Uploader…" : continueLabel}
            </button>
          )}
        </footer>
      </div>
    </section>
  );
}