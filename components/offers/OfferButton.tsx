"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

type OfferButtonProps = {
  listingId: string;
  sellerId: string;
  listingTitle?: string;
  askingPrice?: number | null;
};

type Conversation = {
  id: string;
};

type DatabaseError = {
  code?: string;
  message?: string;
};

function formatPrice(price: number): string {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "DKK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
}

export default function OfferButton({
  listingId,
  sellerId,
  listingTitle,
  askingPrice,
}: OfferButtonProps) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function resetModal() {
    setAmount("");
    setMessage("");
    setError("");
    setSuccess("");
  }

  function openModal() {
    resetModal();
    setIsOpen(true);
  }

  function closeModal() {
    if (isSubmitting) {
      return;
    }

    setIsOpen(false);
    resetModal();
  }

  async function getOrCreateConversation(
    buyerId: string,
  ): Promise<Conversation> {
    const { data: existingConversation, error: searchError } = await supabase
      .from("conversations")
      .select("id")
      .eq("listing_id", listingId)
      .eq("buyer_id", buyerId)
      .eq("seller_id", sellerId)
      .maybeSingle();

    if (searchError) {
      throw new Error(
        `Kunne ikke kontrollere eksisterende samtale: ${searchError.message}`,
      );
    }

    if (existingConversation) {
      return existingConversation as Conversation;
    }

    const { data: newConversation, error: createError } = await supabase
      .from("conversations")
      .insert({
        listing_id: listingId,
        buyer_id: buyerId,
        seller_id: sellerId,
      })
      .select("id")
      .single();

    if (!createError && newConversation) {
      return newConversation as Conversation;
    }

    /*
     * Hvis to forespørgsler opretter samme samtale samtidigt,
     * kan den ene ramme en unique constraint. Derfor forsøger
     * vi at hente samtalen igen, inden vi viser en fejl.
     */
    if ((createError as DatabaseError | null)?.code === "23505") {
      const { data: concurrentConversation, error: retryError } =
        await supabase
          .from("conversations")
          .select("id")
          .eq("listing_id", listingId)
          .eq("buyer_id", buyerId)
          .eq("seller_id", sellerId)
          .single();

      if (!retryError && concurrentConversation) {
        return concurrentConversation as Conversation;
      }
    }

    throw new Error(
      createError?.message ?? "Samtalen kunne ikke oprettes.",
    );
  }

  async function triggerNewOfferEmail({
    conversationId,
    offerId,
  }: {
    conversationId: string;
    offerId: string;
  }) {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error(
          "Budmail kunne ikke sendes: mangler gyldig session.",
          sessionError,
        );
        return;
      }

      const response = await fetch("/api/chat/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          type: "new-offer",
          conversationId,
          offerId,
        }),
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        console.error(
          "Budmail kunne ikke sendes:",
          result?.error || `HTTP ${response.status}`,
        );
      }
    } catch (error) {
      /*
       * Buddet er allerede oprettet. En mailfejl må derfor
       * ikke få selve buddet til at fremstå som fejlet.
       */
      console.error("Budmail fejlede:", error);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setError("");
    setSuccess("");

    const normalizedAmount = amount.replace(",", ".").trim();
    const offerAmount = Number(normalizedAmount);
    const trimmedMessage = message.trim();

    if (
      !Number.isFinite(offerAmount) ||
      offerAmount <= 0
    ) {
      setError("Indtast et gyldigt bud større end 0 kr.");
      return;
    }

    if (Math.round(offerAmount * 100) !== offerAmount * 100) {
      setError("Buddet må højst have to decimaler.");
      return;
    }

    if (trimmedMessage.length > 1000) {
      setError("Beskeden må højst være 1.000 tegn.");
      return;
    }

    setIsSubmitting(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Du skal være logget ind for at afgive et bud.");
      }

      if (user.id === sellerId) {
        throw new Error("Du kan ikke afgive et bud på din egen annonce.");
      }

      const conversation = await getOrCreateConversation(user.id);

      const { data: newOffer, error: offerError } = await supabase
        .from("offers")
        .insert({
          listing_id: listingId,
          conversation_id: conversation.id,
          buyer_id: user.id,
          seller_id: sellerId,
          amount: offerAmount,
          message: trimmedMessage || null,
          status: "pending",
        })
        .select("id")
        .single();

      if (offerError || !newOffer) {
        if (offerError.code === "23505") {
          throw new Error(
            "Du har allerede et aktivt bud på denne annonce.",
          );
        }

        throw new Error(
          `Buddet kunne ikke oprettes: ${
            offerError?.message ?? "Buddet blev ikke returneret fra databasen."
          }`,
        );
      }

      await triggerNewOfferEmail({
        conversationId: conversation.id,
        offerId: newOffer.id,
      });

      setSuccess("Dit bud er sendt til sælgeren.");
      setAmount("");
      setMessage("");

      router.refresh();

      window.setTimeout(() => {
        setIsOpen(false);
        setSuccess("");
      }, 1200);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Der opstod en uventet fejl. Prøv igen.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
      >
        Giv et bud
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="offer-dialog-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="offer-dialog-title"
                  className="text-xl font-semibold text-slate-900"
                >
                  Giv et bud
                </h2>

                {listingTitle ? (
                  <p className="mt-1 text-sm text-slate-600">
                    {listingTitle}
                  </p>
                ) : null}

                {typeof askingPrice === "number" ? (
                  <p className="mt-1 text-sm text-slate-500">
                    Pris: {formatPrice(askingPrice)}
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={isSubmitting}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Luk"
              >
                <span aria-hidden="true">✕</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor={`offer-amount-${listingId}`}
                  className="block text-sm font-medium text-slate-900"
                >
                  Dit bud
                </label>

                <div className="relative mt-2">
                  <input
                    id={`offer-amount-${listingId}`}
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="0"
                    disabled={isSubmitting}
                    autoFocus
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-14 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />

                  <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-slate-500">
                    kr.
                  </span>
                </div>
              </div>

              <div>
                <label
                  htmlFor={`offer-message-${listingId}`}
                  className="block text-sm font-medium text-slate-900"
                >
                  Besked til sælger
                  <span className="ml-1 font-normal text-slate-500">
                    (valgfri)
                  </span>
                </label>

                <textarea
                  id={`offer-message-${listingId}`}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  maxLength={1000}
                  rows={4}
                  placeholder="Skriv eventuelt en kort besked..."
                  disabled={isSubmitting}
                  className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100"
                />

                <p className="mt-1 text-right text-xs text-slate-500">
                  {message.length}/1000
                </p>
              </div>

              {error ? (
                <div
                  role="alert"
                  className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {error}
                </div>
              ) : null}

              {success ? (
                <div
                  role="status"
                  className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700"
                >
                  {success}
                </div>
              ) : null}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Annuller
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || success.length > 0}
                  className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Sender..." : "Send bud"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}