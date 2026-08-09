"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/home/Header";
import { supabase } from "@/lib/supabase";

type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  message_type: string;
  created_at: string;
  read_at: string | null;
};

type OfferStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "withdrawn"
  | "superseded";

type Offer = {
  id: string;
  listing_id: string;
  conversation_id: string;
  buyer_id: string;
  seller_id: string;
  message_id: string | null;
  parent_offer_id: string | null;
  amount: number;
  message: string | null;
  status: OfferStatus;
  created_at: string;
  updated_at: string;
};

type ListingImage = {
  image_url: string;
  sort_order: number | null;
};

type ChatListing = {
  id: string;
  title: string;
  listing_images: ListingImage[];
};

type ChatConversation = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  created_at: string;
  updated_at: string | null;
  listing: ChatListing | null;
};

type ChatProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

export default function ConversationPage() {
  const params = useParams<{ conversationId: string }>();
  const conversationId = params.conversationId;

  const [conversation, setConversation] =
    useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [otherProfile, setOtherProfile] =
    useState<ChatProfile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(
    null
  );

  const [messageBody, setMessageBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [offers, setOffers] = useState<Offer[]>([]);
  const [counterOfferOpen, setCounterOfferOpen] = useState(false);
  const [counterOfferAmount, setCounterOfferAmount] = useState("");
  const [counterOfferMessage, setCounterOfferMessage] = useState("");
  const [counterOfferParent, setCounterOfferParent] =
    useState<Offer | null>(null);
  const [offerActionLoading, setOfferActionLoading] =
    useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function loadConversation() {
      try {
        setLoading(true);
        setErrorMessage("");

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          setCurrentUserId(null);
          return;
        }

        setCurrentUserId(user.id);

        const { data: conversationData, error: conversationError } =
          await supabase
            .from("conversations")
            .select(`
              id,
              listing_id,
              buyer_id,
              seller_id,
              created_at,
              updated_at,
              listing:listings (
                id,
                title,
                listing_images (
                  image_url,
                  sort_order
                )
              )
            `)
            .eq("id", conversationId)
            .maybeSingle();

        if (conversationError) {
          throw conversationError;
        }

        if (!conversationData) {
          throw new Error("Samtalen blev ikke fundet.");
        }

        const formattedConversation =
          conversationData as unknown as ChatConversation;

        const userBelongsToConversation =
          formattedConversation.buyer_id === user.id ||
          formattedConversation.seller_id === user.id;

        if (!userBelongsToConversation) {
          throw new Error(
            "Du har ikke adgang til denne samtale."
          );
        }

        if (formattedConversation.listing) {
          formattedConversation.listing.listing_images = [
            ...(formattedConversation.listing.listing_images ?? []),
          ].sort(
            (firstImage, secondImage) =>
              (firstImage.sort_order ?? 0) -
              (secondImage.sort_order ?? 0)
          );
        }

        setConversation(formattedConversation);

        const otherUserId =
          formattedConversation.buyer_id === user.id
            ? formattedConversation.seller_id
            : formattedConversation.buyer_id;

        const { data: profileData, error: profileError } =
          await supabase
            .from("profiles")
            .select("id, full_name, avatar_url")
            .eq("id", otherUserId)
            .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        setOtherProfile(
          (profileData as ChatProfile | null) ?? null
        );

        const { data: messageData, error: messageError } =
          await supabase
            .from("messages")
            .select(`
              id,
              conversation_id,
              sender_id,
              body,
              message_type,
              created_at,
              read_at
            `)
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true });

        if (messageError) {
          throw messageError;
        }

        setMessages((messageData ?? []) as ChatMessage[]);

        const { data: offerData, error: offerError } = await supabase
          .from("offers")
          .select(`
            id,
            listing_id,
            conversation_id,
            buyer_id,
            seller_id,
            message_id,
            parent_offer_id,
            amount,
            message,
            status,
            created_at,
            updated_at
          `)
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });

        if (offerError) {
          throw offerError;
        }

        setOffers((offerData ?? []) as Offer[]);

        const unreadMessageIds = (messageData ?? [])
          .filter(
            (message) =>
              message.sender_id !== user.id &&
              message.read_at === null
          )
          .map((message) => message.id);

        if (unreadMessageIds.length > 0) {
          const { error: readError } = await supabase
            .from("messages")
            .update({
              read_at: new Date().toISOString(),
            })
            .in("id", unreadMessageIds);

          if (readError) {
            console.error(
              "Kunne ikke markere beskeder som læst:",
              readError
            );
          }

          setMessages((currentMessages) =>
            currentMessages.map((message) =>
              unreadMessageIds.includes(message.id)
                ? {
                    ...message,
                    read_at: new Date().toISOString(),
                  }
                : message
            )
          );
        }
      } catch (error) {
        console.error("Kunne ikke hente samtalen:", error);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Kunne ikke hente samtalen."
        );
      } finally {
        setLoading(false);
      }
    }

    if (conversationId) {
      loadConversation();
    }
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  async function triggerChatEmail(
    payload:
      | {
          type: "new-message";
          messageId: string;
        }
      | {
          type: "counter-offer" | "offer-accepted" | "offer-rejected";
          offerId: string;
        }
  ) {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error(
          "Mailnotifikation kunne ikke sendes: mangler gyldig session.",
          sessionError
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
          conversationId,
          ...payload,
        }),
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        console.error(
          "Mailnotifikation kunne ikke sendes:",
          result?.error || `HTTP ${response.status}`
        );
      }
    } catch (error) {
      /*
       * E-mail er sekundær. En allerede gemt besked eller et allerede
       * opdateret bud må ikke fremstå som fejlet, bare fordi mailen fejler.
       */
      console.error("Mailnotifikation fejlede:", error);
    }
  }

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedBody = messageBody.trim();

    if (
      !trimmedBody ||
      !currentUserId ||
      !conversation ||
      sending
    ) {
      return;
    }

    try {
      setSending(true);
      setErrorMessage("");

      const { data: newMessage, error: messageError } =
        await supabase
          .from("messages")
          .insert({
            conversation_id: conversation.id,
            sender_id: currentUserId,
            body: trimmedBody,
            message_type: "text",
          })
          .select(`
            id,
            conversation_id,
            sender_id,
            body,
            message_type,
            created_at,
            read_at
          `)
          .single();

      if (messageError) {
        throw messageError;
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        newMessage as ChatMessage,
      ]);

      setMessageBody("");

      const { error: updateError } = await supabase
        .from("conversations")
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversation.id);

      if (updateError) {
        console.error(
          "Kunne ikke opdatere samtalens tidspunkt:",
          updateError
        );
      }

      await triggerChatEmail({
        type: "new-message",
        messageId: newMessage.id,
      });
    } catch (error) {
      console.error("Kunne ikke sende beskeden:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Beskeden kunne ikke sendes."
      );
    } finally {
      setSending(false);
    }
  }


  function getOfferSenderId(offer: Offer) {
    const linkedMessage = messages.find(
      (message) => message.id === offer.message_id
    );

    return linkedMessage?.sender_id ?? offer.buyer_id;
  }

  function getOfferReceiverId(offer: Offer) {
    const senderId = getOfferSenderId(offer);

    return senderId === offer.buyer_id
      ? offer.seller_id
      : offer.buyer_id;
  }

  async function handleOfferStatus(
    offer: Offer,
    newStatus: "accepted" | "declined"
  ) {
    if (!currentUserId || offerActionLoading) return;

    if (offer.status !== "pending") {
      setErrorMessage("Buddet er ikke længere aktivt.");
      return;
    }

    if (getOfferReceiverId(offer) !== currentUserId) {
      setErrorMessage("Kun modtageren kan acceptere eller afslå buddet.");
      return;
    }

    try {
      setOfferActionLoading(offer.id);
      setErrorMessage("");

      const { error: updateError } = await supabase
        .from("offers")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", offer.id)
        .eq("status", "pending");

      if (updateError) throw updateError;

      const body =
        newStatus === "accepted"
          ? `Buddet på ${Number(offer.amount).toLocaleString("da-DK")} kr. blev accepteret.`
          : `Buddet på ${Number(offer.amount).toLocaleString("da-DK")} kr. blev afslået.`;

      const { data: statusMessage, error: messageError } = await supabase
        .from("messages")
        .insert({
          conversation_id: offer.conversation_id,
          sender_id: currentUserId,
          body,
          message_type:
            newStatus === "accepted" ? "offer_accepted" : "offer_declined",
        })
        .select(`
          id,
          conversation_id,
          sender_id,
          body,
          message_type,
          created_at,
          read_at
        `)
        .single();

      if (!messageError && statusMessage) {
        setMessages((current) => [
          ...current,
          statusMessage as ChatMessage,
        ]);
      }

      setOffers((current) =>
        current.map((item) =>
          item.id === offer.id
            ? {
                ...item,
                status: newStatus,
                updated_at: new Date().toISOString(),
              }
            : item
        )
      );

      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", offer.conversation_id);

      await triggerChatEmail({
        type:
          newStatus === "accepted"
            ? "offer-accepted"
            : "offer-rejected",
        offerId: offer.id,
      });
    } catch (error) {
      console.error("Buddet kunne ikke opdateres:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Buddet kunne ikke opdateres."
      );
    } finally {
      setOfferActionLoading(null);
    }
  }

  function openCounterOffer(offer: Offer) {
    setCounterOfferParent(offer);
    setCounterOfferAmount("");
    setCounterOfferMessage("");
    setErrorMessage("");
    setCounterOfferOpen(true);
  }

  async function handleSendCounterOffer(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !counterOfferParent ||
      !currentUserId ||
      !conversation ||
      offerActionLoading
    ) {
      return;
    }

    const normalizedAmount = counterOfferAmount
      .replace(/\./g, "")
      .replace(",", ".");

    const amount = Number(normalizedAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setErrorMessage("Indtast et gyldigt modbud.");
      return;
    }

    try {
      setOfferActionLoading(counterOfferParent.id);
      setErrorMessage("");

      const body = counterOfferMessage.trim()
        ? `Modbud på ${amount.toLocaleString("da-DK")} kr.\n\n${counterOfferMessage.trim()}`
        : `Modbud på ${amount.toLocaleString("da-DK")} kr.`;

      const { data: newMessage, error: messageError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversation.id,
          sender_id: currentUserId,
          body,
          message_type: "offer",
        })
        .select(`
          id,
          conversation_id,
          sender_id,
          body,
          message_type,
          created_at,
          read_at
        `)
        .single();

      if (messageError) throw messageError;

      const { data: newOffer, error: newOfferError } = await supabase
        .from("offers")
        .insert({
          listing_id: conversation.listing_id,
          conversation_id: conversation.id,
          buyer_id: conversation.buyer_id,
          seller_id: conversation.seller_id,
          amount,
          message: counterOfferMessage.trim() || null,
          status: "pending",
          message_id: newMessage.id,
          parent_offer_id: counterOfferParent.id,
        })
        .select(`
          id,
          listing_id,
          conversation_id,
          buyer_id,
          seller_id,
          message_id,
          parent_offer_id,
          amount,
          message,
          status,
          created_at,
          updated_at
        `)
        .single();

      if (newOfferError) {
        await supabase.from("messages").delete().eq("id", newMessage.id);
        throw newOfferError;
      }

      await supabase
        .from("offers")
        .update({
          status: "superseded",
          updated_at: new Date().toISOString(),
        })
        .eq("id", counterOfferParent.id)
        .eq("status", "pending");

      setMessages((current) => [
        ...current,
        newMessage as ChatMessage,
      ]);

      setOffers((current) => [
        ...current.map((item) =>
          item.id === counterOfferParent.id
            ? { ...item, status: "superseded" as const }
            : item
        ),
        newOffer as Offer,
      ]);

      setCounterOfferOpen(false);
      setCounterOfferParent(null);
      setCounterOfferAmount("");
      setCounterOfferMessage("");

      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversation.id);

      await triggerChatEmail({
        type: "counter-offer",
        offerId: newOffer.id,
      });
    } catch (error) {
      console.error("Modbuddet kunne ikke sendes:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Modbuddet kunne ikke sendes."
      );
    } finally {
      setOfferActionLoading(null);
    }
  }

  if (loading) {
    return (
      <>
        <Header />

        <main className="min-h-screen bg-[#fbfaf7] px-5 pb-20 pt-24 sm:pt-32">
          <div className="mx-auto max-w-4xl rounded-[28px] border border-[#eadfcb] bg-white p-8 shadow-sm">
            <p className="text-stone-500">
              Henter samtalen...
            </p>
          </div>
        </main>
      </>
    );
  }

  if (!currentUserId) {
    return (
      <>
        <Header />

        <main className="min-h-screen bg-[#fbfaf7] px-5 pb-20 pt-24 sm:pt-32">
          <div className="mx-auto max-w-4xl rounded-[28px] border border-[#eadfcb] bg-white p-8 shadow-sm">
            <h1 className="font-serif text-3xl text-[#063f32]">
              Du skal være logget ind
            </h1>

            <p className="mt-3 text-stone-600">
              Log ind for at åbne denne samtale.
            </p>

            <Link
              href="/login"
              className="mt-6 inline-flex rounded-full bg-[#063f32] px-7 py-3 font-medium text-white transition hover:bg-[#052f26]"
            >
              Log ind
            </Link>
          </div>
        </main>
      </>
    );
  }

  if (errorMessage && !conversation) {
    return (
      <>
        <Header />

        <main className="min-h-screen bg-[#fbfaf7] px-5 pb-20 pt-24 sm:pt-32">
          <div className="mx-auto max-w-4xl rounded-[28px] border border-red-200 bg-white p-8 shadow-sm">
            <h1 className="font-serif text-3xl text-[#063f32]">
              Samtalen kunne ikke åbnes
            </h1>

            <p className="mt-3 text-red-700">{errorMessage}</p>

            <Link
              href="/beskeder"
              className="mt-6 inline-flex rounded-full bg-[#063f32] px-7 py-3 font-medium text-white transition hover:bg-[#052f26]"
            >
              Tilbage til beskeder
            </Link>
          </div>
        </main>
      </>
    );
  }

  if (!conversation) {
    return null;
  }

  const listingImage =
    conversation.listing?.listing_images?.[0]?.image_url ?? null;

  const profileName =
    otherProfile?.full_name?.trim() || "Equishopper-bruger";

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#fbfaf7] pb-16 pt-16 sm:pt-20">
        <section className="bg-[#063f32]">
          <div className="mx-auto max-w-4xl px-5 pb-10 pt-20 sm:pt-24">
            <Link
              href="/beskeder"
              className="inline-flex items-center gap-2 text-sm text-white/70 transition hover:text-white"
            >
              <span aria-hidden="true">←</span>
              Tilbage til beskeder
            </Link>

            <div className="mt-7 flex items-center gap-4">
              <ListingImage
                imageUrl={listingImage}
                title={conversation.listing?.title}
              />

              <div className="min-w-0">
                <p className="text-sm text-[#d4af37]">
                  Samtale med {profileName}
                </p>

                <h1 className="mt-1 truncate font-serif text-3xl text-white sm:text-4xl">
                  {conversation.listing?.title ?? "Annonce"}
                </h1>

                <div className="mt-3 flex items-center gap-2">
                  <ProfileAvatar
                    avatarUrl={otherProfile?.avatar_url}
                    profileName={profileName}
                  />

                  <span className="truncate text-sm text-white/70">
                    {profileName}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-4xl px-5">
          <div className="-mt-5 overflow-hidden rounded-[32px] border border-[#eadfcb] bg-white shadow-sm">
            {errorMessage && (
              <div className="border-b border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            <div className="min-h-[420px] bg-[#f8f6f1] px-4 py-6 sm:px-7 sm:py-8">
              <div className="space-y-4">
                {messages.map((message) => {
                  const offer = offers.find(
                    (item) => item.message_id === message.id
                  );

                  const isOwnMessage =
                    message.sender_id === currentUserId;

                  if (offer) {
                    const canRespond =
                      getOfferReceiverId(offer) === currentUserId &&
                      offer.status === "pending";

                    return (
                      <div
                        key={message.id}
                        className={`flex ${
                          isOwnMessage
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div className="w-full max-w-md overflow-hidden rounded-[24px] border border-[#d4af37]/50 bg-white shadow-sm">
                          <div className="bg-[#063f32] px-5 py-4 text-white">
                            <p className="text-[10px] uppercase tracking-[0.22em] text-[#d4af37]">
                              {offer.parent_offer_id ? "Modbud" : "Bud"}
                            </p>

                            <p className="mt-1 font-serif text-3xl">
                              {Number(offer.amount).toLocaleString("da-DK")} kr.
                            </p>
                          </div>

                          <div className="p-5">
                            {offer.message && (
                              <p className="whitespace-pre-wrap text-sm leading-6 text-stone-600">
                                {offer.message}
                              </p>
                            )}

                            <div className="mt-4 flex items-center justify-between gap-3">
                              <OfferStatusBadge status={offer.status} />

                              <span className="text-xs text-stone-400">
                                {new Date(offer.created_at).toLocaleString(
                                  "da-DK",
                                  {
                                    dateStyle: "short",
                                    timeStyle: "short",
                                  }
                                )}
                              </span>
                            </div>

                            {canRespond && (
                              <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                                <button
                                  type="button"
                                  disabled={offerActionLoading === offer.id}
                                  onClick={() =>
                                    handleOfferStatus(offer, "declined")
                                  }
                                  className="rounded-full border border-red-200 px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                                >
                                  Afslå
                                </button>

                                <button
                                  type="button"
                                  disabled={offerActionLoading === offer.id}
                                  onClick={() => openCounterOffer(offer)}
                                  className="rounded-full border border-[#d4af37] px-4 py-2.5 text-sm font-medium text-[#063f32] transition hover:bg-[#f4ead0] disabled:opacity-50"
                                >
                                  Modbud
                                </button>

                                <button
                                  type="button"
                                  disabled={offerActionLoading === offer.id}
                                  onClick={() =>
                                    handleOfferStatus(offer, "accepted")
                                  }
                                  className="rounded-full bg-[#063f32] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#052f26] disabled:opacity-50"
                                >
                                  Accepter
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={message.id}
                      className={`flex ${
                        isOwnMessage ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[82%] rounded-[22px] px-4 py-3 shadow-sm ${
                          isOwnMessage
                            ? "rounded-br-md bg-[#063f32] text-white"
                            : "rounded-bl-md border border-[#eadfcb] bg-white text-[#063f32]"
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-[15px] leading-6">
                          {message.body}
                        </p>

                        <p
                          className={`mt-1.5 text-right text-[10px] ${
                            isOwnMessage
                              ? "text-white/50"
                              : "text-stone-400"
                          }`}
                        >
                          {new Date(message.created_at).toLocaleTimeString(
                            "da-DK",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {messages.length === 0 && (
                  <div className="py-16 text-center">
                    <p className="font-serif text-2xl text-[#063f32]">
                      Ingen beskeder endnu
                    </p>
                    <p className="mt-2 text-sm text-stone-500">
                      Start samtalen ved at sende en besked.
                    </p>
                  </div>
                )}
              </div>

              <div ref={messagesEndRef} />
            </div>

            <form
              onSubmit={handleSendMessage}
              className="border-t border-[#eadfcb] bg-white p-4 sm:p-5"
            >
              <div className="flex items-end gap-3">
                <label htmlFor="message" className="sr-only">
                  Skriv en besked
                </label>

                <textarea
                  id="message"
                  value={messageBody}
                  onChange={(event) =>
                    setMessageBody(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey
                    ) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  rows={1}
                  maxLength={2000}
                  placeholder={`Skriv en besked til ${profileName}...`}
                  className="max-h-40 min-h-12 flex-1 resize-none rounded-2xl border border-[#d9ccb4] bg-[#fbfaf7] px-4 py-3 text-[15px] text-[#063f32] outline-none transition placeholder:text-stone-400 focus:border-[#063f32] focus:ring-2 focus:ring-[#063f32]/10"
                />

                <button
                  type="submit"
                  disabled={!messageBody.trim() || sending}
                  className="flex h-12 flex-none items-center justify-center rounded-full bg-[#063f32] px-6 font-medium text-white transition hover:bg-[#052f26] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {sending ? "Sender..." : "Send"}
                </button>
              </div>

              <p className="mt-2 px-1 text-xs text-stone-400">
                Enter sender beskeden. Shift + Enter laver en ny
                linje.
              </p>
            </form>
          </div>
        </div>

        {counterOfferOpen && counterOfferParent && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm"
            onClick={() => {
              if (!offerActionLoading) setCounterOfferOpen(false);
            }}
          >
            <div
              className="w-full max-w-md rounded-[28px] border border-[#eadfcb] bg-[#fbfaf7] p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[#b79a3d]">
                    Send modbud
                  </p>
                  <h2 className="mt-2 font-serif text-3xl text-[#063f32]">
                    Nyt beløb
                  </h2>
                  <p className="mt-2 text-sm text-stone-500">
                    Seneste bud:{" "}
                    {Number(counterOfferParent.amount).toLocaleString(
                      "da-DK"
                    )}{" "}
                    kr.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={Boolean(offerActionLoading)}
                  onClick={() => setCounterOfferOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#063f32] shadow-sm disabled:opacity-50"
                  aria-label="Luk"
                >
                  ×
                </button>
              </div>

              <form
                onSubmit={handleSendCounterOffer}
                className="mt-6 space-y-5"
              >
                <div>
                  <label
                    htmlFor="counterOfferAmount"
                    className="mb-2 block text-sm font-medium text-[#063f32]"
                  >
                    Dit modbud
                  </label>

                  <div className="relative">
                    <input
                      id="counterOfferAmount"
                      type="text"
                      inputMode="decimal"
                      autoFocus
                      value={counterOfferAmount}
                      onChange={(event) =>
                        setCounterOfferAmount(event.target.value)
                      }
                      placeholder="Fx 3.750"
                      className="w-full rounded-2xl border border-[#d9ccb4] bg-white px-4 py-3.5 pr-14 text-lg text-[#063f32] outline-none focus:border-[#063f32]"
                    />

                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-stone-500">
                      kr.
                    </span>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="counterOfferMessage"
                    className="mb-2 block text-sm font-medium text-[#063f32]"
                  >
                    Besked
                  </label>

                  <textarea
                    id="counterOfferMessage"
                    rows={4}
                    maxLength={1000}
                    value={counterOfferMessage}
                    onChange={(event) =>
                      setCounterOfferMessage(event.target.value)
                    }
                    placeholder="Valgfri besked..."
                    className="w-full resize-none rounded-2xl border border-[#d9ccb4] bg-white px-4 py-3.5 text-[#063f32] outline-none focus:border-[#063f32]"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={Boolean(offerActionLoading)}
                    onClick={() => setCounterOfferOpen(false)}
                    className="flex-1 rounded-full border border-[#d9ccb4] px-5 py-3.5 font-medium text-[#063f32] disabled:opacity-50"
                  >
                    Annuller
                  </button>

                  <button
                    type="submit"
                    disabled={
                      !counterOfferAmount.trim() ||
                      Boolean(offerActionLoading)
                    }
                    className="flex-1 rounded-full bg-[#063f32] px-5 py-3.5 font-medium text-white disabled:opacity-50"
                  >
                    {offerActionLoading ? "Sender..." : "Send modbud"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </>
  );
}


function OfferStatusBadge({
  status,
}: {
  status: OfferStatus;
}) {
  const labels: Record<OfferStatus, string> = {
    pending: "Afventer svar",
    accepted: "Accepteret",
    declined: "Afslået",
    withdrawn: "Trukket tilbage",
    superseded: "Erstattet af modbud",
  };

  const styles: Record<OfferStatus, string> = {
    pending: "border-amber-200 bg-amber-50 text-amber-800",
    accepted: "border-green-200 bg-green-50 text-green-800",
    declined: "border-red-200 bg-red-50 text-red-700",
    withdrawn: "border-stone-200 bg-stone-100 text-stone-600",
    superseded: "border-blue-200 bg-blue-50 text-blue-700",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function ListingImage({
  imageUrl,
  title,
}: {
  imageUrl: string | null;
  title?: string;
}) {
  if (imageUrl) {
    return (
      <div
        role="img"
        aria-label={title ?? "Annoncebillede"}
        className="h-20 w-20 flex-none rounded-2xl border border-white/20 bg-cover bg-center shadow-sm sm:h-24 sm:w-24"
        style={{
          backgroundImage: `url("${imageUrl}")`,
        }}
      />
    );
  }

  return (
    <div className="flex h-20 w-20 flex-none items-center justify-center rounded-2xl bg-white/10 font-serif text-2xl text-[#d4af37] ring-1 ring-white/20 sm:h-24 sm:w-24">
      {getInitial(title)}
    </div>
  );
}

function ProfileAvatar({
  avatarUrl,
  profileName,
}: {
  avatarUrl?: string | null;
  profileName: string;
}) {
  if (avatarUrl) {
    return (
      <div
        role="img"
        aria-label={profileName}
        className="h-8 w-8 flex-none rounded-full bg-cover bg-center ring-2 ring-white/20"
        style={{
          backgroundImage: `url("${avatarUrl}")`,
        }}
      />
    );
  }

  return (
    <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[#d4af37] text-xs font-bold text-[#063f32]">
      {getInitial(profileName)}
    </div>
  );
}

function getInitial(value?: string | null) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return "E";
  }

  return trimmedValue.charAt(0).toUpperCase();
}