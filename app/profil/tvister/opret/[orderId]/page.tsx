"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  FileText,
  ImagePlus,
  Loader2,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import Header from "@/components/home/Header";
import { supabase } from "@/lib/supabase";

type DisputeReason =
  | "not_received"
  | "damaged"
  | "not_as_described"
  | "wrong_item"
  | "missing_parts"
  | "suspected_counterfeit"
  | "other";

type CreatedDispute = {
  id: string;
};

const reasonOptions: {
  value: DisputeReason;
  label: string;
  description: string;
}[] = [
  {
    value: "not_received",
    label: "Varen er ikke modtaget",
    description: "Forsendelsen er ikke kommet frem.",
  },
  {
    value: "damaged",
    label: "Varen er beskadiget",
    description: "Varen er modtaget med væsentlige skader.",
  },
  {
    value: "not_as_described",
    label: "Varen svarer ikke til annoncen",
    description: "Stand, størrelse eller andre væsentlige forhold afviger.",
  },
  {
    value: "wrong_item",
    label: "Forkert vare",
    description: "Den modtagne vare er ikke den købte vare.",
  },
  {
    value: "missing_parts",
    label: "Væsentlige dele mangler",
    description: "Varen er ikke komplet som beskrevet.",
  },
  {
    value: "suspected_counterfeit",
    label: "Mistanke om uægte vare",
    description: "Varen kan være en kopi eller forfalskning.",
  },
  {
    value: "other",
    label: "Andet",
    description: "Problemet passer ikke til de øvrige kategorier.",
  },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 6;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export default function CreateDisputePage() {
  const params = useParams<{ orderId: string }>();
  const router = useRouter();
  const orderId = params.orderId;

  const [reason, setReason] =
    useState<DisputeReason>("not_as_described");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const remainingCharacters = useMemo(
    () => 120 - subject.length,
    [subject.length]
  );

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (selectedFiles.length === 0) return;

    setErrorMessage("");

    const combinedFiles = [...files, ...selectedFiles];

    if (combinedFiles.length > MAX_FILES) {
      setErrorMessage(`Du kan højst uploade ${MAX_FILES} filer.`);
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
    setErrorMessage("");
  }

  async function uploadEvidence(
    disputeId: string,
    userId: string,
    selectedFiles: File[]
  ) {
    for (const file of selectedFiles) {
      const safeName = file.name
        .normalize("NFKD")
        .replace(/[^\w.-]+/g, "-")
        .replace(/-+/g, "-")
        .toLowerCase();

      const storagePath = `${disputeId}/${userId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

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
          dispute_id: disputeId,
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
          dispute_id: disputeId,
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

    if (submitting) return;

    try {
      setSubmitting(true);
      setErrorMessage("");

      const trimmedSubject = subject.trim();
      const trimmedDescription = description.trim();

      if (!orderId) {
        throw new Error("Ordren mangler.");
      }

      if (!trimmedSubject) {
        throw new Error("Du skal skrive en overskrift.");
      }

      if (trimmedSubject.length > 120) {
        throw new Error("Overskriften må højst være 120 tegn.");
      }

      if (trimmedDescription.length < 20) {
        throw new Error(
          "Beskriv problemet med mindst 20 tegn."
        );
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        router.push(
          `/login?redirect=/profil/tvister/opret/${encodeURIComponent(
            orderId
          )}`
        );
        return;
      }

      const { data, error: disputeError } = await supabase.rpc(
        "create_dispute",
        {
          p_order_id: orderId,
          p_reason: reason,
          p_subject: trimmedSubject,
          p_description: trimmedDescription,
        }
      );

      if (disputeError) {
        if (
          disputeError.message
            .toLowerCase()
            .includes("disputes_one_active_per_order")
        ) {
          throw new Error(
            "Der findes allerede en aktiv tvist på denne ordre."
          );
        }

        throw disputeError;
      }

      const createdDispute = Array.isArray(data)
        ? (data[0] as CreatedDispute | undefined)
        : (data as CreatedDispute | null);

      if (!createdDispute?.id) {
        throw new Error("Tvisten blev oprettet uden et gyldigt id.");
      }

      if (files.length > 0) {
        await uploadEvidence(createdDispute.id, user.id, files);
      }

      router.replace(`/profil/tvister/${createdDispute.id}`);
      router.refresh();
    } catch (error) {
      console.error("Kunne ikke oprette tvist:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Tvisten kunne ikke oprettes."
      );
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f8f5ee]">
      <Header />

      <section className="bg-[#063f32] px-4 pb-16 pt-32 sm:px-6 sm:pt-36 lg:px-8">
        <div className="mx-auto w-full max-w-4xl">
          <Link
            href="/profil"
            className="inline-flex items-center gap-2 text-sm font-semibold text-white/70 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Tilbage til min side
          </Link>

          <p className="mt-7 text-sm font-semibold uppercase tracking-[0.3em] text-[#d4af37]">
            Køberbeskyttelse
          </p>

          <h1 className="mt-4 font-serif text-4xl font-bold text-white sm:text-5xl">
            Opret en tvist
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-white/65">
            Beskriv problemet tydeligt og vedhæft relevant dokumentation.
            Betalingen tilbageholdes, mens sagen behandles.
          </p>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-4xl">
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[#eadfcb] bg-[#fbfaf7] p-5 text-sm leading-6 text-stone-600">
            <ShieldCheck className="mt-0.5 h-5 w-5 flex-none text-[#0b5a47]" />
            <p>
              Tvisten knyttes til ordre{" "}
              <span className="font-mono text-xs font-semibold text-[#063f32]">
                {orderId}
              </span>
              . Equishopper kan bede begge parter om yderligere
              dokumentation.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <section className="rounded-[30px] border border-[#e7e1d7] bg-white p-6 shadow-[0_18px_60px_rgba(35,45,40,0.06)] sm:p-8">
              <h2 className="font-serif text-2xl font-bold text-[#063f32]">
                Hvad drejer sagen sig om?
              </h2>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {reasonOptions.map((option) => {
                  const active = option.value === reason;

                  return (
                    <label
                      key={option.value}
                      className={`cursor-pointer rounded-2xl border p-4 transition ${
                        active
                          ? "border-[#0b5a47] bg-[#f0f6f1]"
                          : "border-stone-200 hover:border-[#0b5a47]/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={option.value}
                        checked={active}
                        onChange={() => {
                          setReason(option.value);
                          setErrorMessage("");
                        }}
                        disabled={submitting}
                        className="sr-only"
                      />

                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-1 flex h-5 w-5 flex-none items-center justify-center rounded-full border ${
                            active
                              ? "border-[#0b5a47]"
                              : "border-stone-300"
                          }`}
                        >
                          {active && (
                            <span className="h-2.5 w-2.5 rounded-full bg-[#0b5a47]" />
                          )}
                        </span>

                        <span>
                          <span className="block font-semibold text-[#063f32]">
                            {option.label}
                          </span>
                          <span className="mt-1 block text-sm leading-5 text-stone-500">
                            {option.description}
                          </span>
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[30px] border border-[#e7e1d7] bg-white p-6 shadow-[0_18px_60px_rgba(35,45,40,0.06)] sm:p-8">
              <h2 className="font-serif text-2xl font-bold text-[#063f32]">
                Beskriv problemet
              </h2>

              <label className="mt-6 block">
                <span className="mb-2 flex items-center justify-between gap-4 text-sm font-semibold text-stone-700">
                  <span>Overskrift</span>
                  <span
                    className={
                      remainingCharacters < 0
                        ? "text-red-600"
                        : "text-stone-400"
                    }
                  >
                    {remainingCharacters} tegn tilbage
                  </span>
                </span>

                <input
                  required
                  type="text"
                  maxLength={120}
                  value={subject}
                  onChange={(event) => {
                    setSubject(event.target.value);
                    setErrorMessage("");
                  }}
                  disabled={submitting}
                  placeholder="Eksempel: Varen har en skade, som ikke fremgik af annoncen"
                  className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3.5 text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-[#0b5a47] focus:ring-4 focus:ring-[#0b5a47]/10 disabled:bg-stone-50"
                />
              </label>

              <label className="mt-5 block">
                <span className="mb-2 block text-sm font-semibold text-stone-700">
                  Beskrivelse
                </span>

                <textarea
                  required
                  minLength={20}
                  rows={8}
                  value={description}
                  onChange={(event) => {
                    setDescription(event.target.value);
                    setErrorMessage("");
                  }}
                  disabled={submitting}
                  placeholder="Beskriv, hvad der er sket, hvornår du modtog varen, og hvordan den afviger fra aftalen."
                  className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3.5 text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-[#0b5a47] focus:ring-4 focus:ring-[#0b5a47]/10 disabled:bg-stone-50"
                />
              </label>
            </section>

            <section className="rounded-[30px] border border-[#e7e1d7] bg-white p-6 shadow-[0_18px_60px_rgba(35,45,40,0.06)] sm:p-8">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[#f0f6f1] text-[#0b5a47]">
                  <ImagePlus className="h-5 w-5" />
                </span>

                <div>
                  <h2 className="font-serif text-2xl font-bold text-[#063f32]">
                    Dokumentation
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-stone-500">
                    Valgfrit. Upload op til {MAX_FILES} billeder eller PDF-filer,
                    højst 10 MB pr. fil.
                  </p>
                </div>
              </div>

              <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-stone-300 px-6 py-10 text-center transition hover:border-[#0b5a47] hover:bg-[#fbfaf7]">
                <ImagePlus className="h-8 w-8 text-[#0b5a47]" />
                <span className="mt-3 font-semibold text-[#063f32]">
                  Vælg dokumentation
                </span>
                <span className="mt-1 text-sm text-stone-500">
                  JPG, PNG, WebP eller PDF
                </span>

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
                <div className="mt-5 space-y-3">
                  {files.map((file, index) => (
                    <div
                      key={`${file.name}-${file.lastModified}-${index}`}
                      className="flex items-center gap-3 rounded-2xl border border-[#eadfcb] p-4"
                    >
                      <FileText className="h-5 w-5 flex-none text-[#0b5a47]" />

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
                        className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-stone-500 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {errorMessage && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
              >
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-none" />
                <p>{errorMessage}</p>
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 rounded-[26px] border border-[#e7e1d7] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <Link
                href="/profil"
                className="inline-flex items-center justify-center rounded-full border border-stone-300 px-6 py-3 font-semibold text-stone-700 transition hover:bg-stone-50"
              >
                Annuller
              </Link>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex min-w-52 items-center justify-center gap-2 rounded-full bg-[#d4af37] px-8 py-3.5 font-semibold text-[#063f32] transition hover:bg-[#e1c05a] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting && (
                  <Loader2 className="h-5 w-5 animate-spin" />
                )}
                {submitting
                  ? "Opretter tvist..."
                  : "Send tvist"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

function formatFileSize(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}