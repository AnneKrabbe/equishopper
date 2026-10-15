

"use client";

import Link from "next/link";

import { FormEvent, useEffect, useRef, useState } from "react";

import { useParams } from "next/navigation";

import Header from "@/components/home/Header";

import { supabase } from "@/lib/supabase";
import { ImagePlus } from "lucide-react";

type ChatMessage = {

  id: string;

  conversation_id: string;

  sender_id: string;

  body: string;

  message_type: string;

  created_at: string;

  read_at: string | null;

};

type MessageAttachment = {
  id: string;
  message_id: string;
  storage_path: string;
  file_name: string;
  content_type: string;
};

type PendingImage = {
  id: string;
  file: File;
  previewUrl: string;
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

  listing_id: string | null;

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

  const [currentUserId, setCurrentUserId] =

    useState<string | null>(null);

  const [messageBody, setMessageBody] = useState("");
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [preparingImages, setPreparingImages] = useState(false);
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [privateImageUrls, setPrivateImageUrls] = useState<Record<string, string>>({});
  const imageUrlsRef = useRef<string[]>([]);
  const selectedImageUrlsRef = useRef<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);


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

        const {

          data: conversationData,

          error: conversationError,

        } = await supabase

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

        const {

          data: profileData,

          error: profileError,

        } = await supabase

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

        const {

          data: messageData,

          error: messageError,

        } = await supabase

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
        const messageIds = (messageData ?? []).map((message) => message.id);
        if (messageIds.length > 0) {
          const { data: attachmentData, error: attachmentError } = await supabase
            .from("message_attachments")
            .select("id, message_id, storage_path, file_name, content_type")
            .in("message_id", messageIds);
          if (attachmentError) throw attachmentError;
          setAttachments((attachmentData ?? []) as MessageAttachment[]);
        } else {
          setAttachments([]);
        }


        const {

          data: offerData,

          error: offerError,

        } = await supabase

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

  useEffect(() => {
    let cancelled = false;
    const loadPrivateImages = async () => {
      for (const attachment of attachments) {
        if (imageUrlsRef.current.some((item) => item.startsWith(attachment.id + "|"))) continue;
        const { data, error } = await supabase.storage
          .from("chat-attachments")
          .download(attachment.storage_path);
        if (cancelled) return;
        if (error || !data) {
          console.error("Kunne ikke hente chatbillede:", error);
          continue;
        }
        const url = URL.createObjectURL(data);
        imageUrlsRef.current.push(`${attachment.id}|${url}`);
        setPrivateImageUrls((current) => ({ ...current, [attachment.id]: url }));
      }
    };
    void loadPrivateImages();
    return () => { cancelled = true; };
  }, [attachments]);

  useEffect(() => {
    return () => {
      for (const value of imageUrlsRef.current) URL.revokeObjectURL(value.slice(value.indexOf("|") + 1));
      for (const url of selectedImageUrlsRef.current) URL.revokeObjectURL(url);
    };
  }, []);

  async function chooseImages(files: FileList | null) {
    if (!files || preparingImages || sending) return;
    const selected = Array.from(files);
    if (selected.length + pendingImages.length > 5) {
      setErrorMessage("Du kan højst vedhæfte 5 billeder ad gangen.");
      return;
    }
    if (selected.some((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type))) {
      setErrorMessage("Vælg billeder i JPG-, PNG- eller WebP-format.");
      return;
    }
    setPreparingImages(true);
    setErrorMessage("");
    const prepared: PendingImage[] = [];
    try {
      for (const file of selected) {
        const result = await prepareChatImage(file);
        const previewUrl = URL.createObjectURL(result);
        selectedImageUrlsRef.current.push(previewUrl);
        prepared.push({ id: crypto.randomUUID(), file: result, previewUrl });
      }
      setPendingImages((current) => [...current, ...prepared]);
    } catch (error) {
      for (const item of prepared) {
        URL.revokeObjectURL(item.previewUrl);
        selectedImageUrlsRef.current = selectedImageUrlsRef.current.filter((url) => url !== item.previewUrl);
      }
      setErrorMessage(error instanceof Error ? error.message : "Billederne kunne ikke klargøres.");
    } finally {
      setPreparingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removePendingImage(id: string) {
    setPendingImages((current) => {
      const item = current.find((image) => image.id === id);
      if (item) {
        URL.revokeObjectURL(item.previewUrl);
        selectedImageUrlsRef.current = selectedImageUrlsRef.current.filter((url) => url !== item.previewUrl);
      }
      return current.filter((image) => image.id !== id);
    });
  }

  async function triggerChatEmail(

    payload:

      | {

          type: "new-message";

          messageId: string;

        }

      | {

          type:

            | "counter-offer"

            | "offer-accepted"

            | "offer-rejected";

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

       * E-mail er sekundær. En allerede gemt besked

       * eller et allerede opdateret bud må ikke fremstå

       * som fejlet, bare fordi mailen fejler.

       */

      console.error("Mailnotifikation fejlede:", error);

    }

  }

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedBody = messageBody.trim();
    if ((!trimmedBody && pendingImages.length === 0) || !currentUserId || !conversation || sending || preparingImages) return;

    setSending(true);
    setErrorMessage("");
    try {
      // Upload først, så en uploadfejl ikke sender en tom besked.
      const uploaded: Array<{ path: string; file: File }> = [];
      for (const item of pendingImages) {
        const path = `${conversation.id}/${currentUserId}/${crypto.randomUUID()}.webp`;
        const { error } = await supabase.storage.from("chat-attachments").upload(path, item.file, {
          contentType: "image/webp", upsert: false,
        });
        if (error) throw new Error(`Et billede kunne ikke uploades: ${error.message}`);
        uploaded.push({ path, file: item.file });
      }

      const { data: newMessage, error: messageError } = await supabase
        .from("messages")
        .insert({ conversation_id: conversation.id, sender_id: currentUserId, body: trimmedBody, message_type: "text" })
        .select("id, conversation_id, sender_id, body, message_type, created_at, read_at")
        .single();
      if (messageError || !newMessage) throw messageError ?? new Error("Beskeden blev ikke gemt.");

      if (uploaded.length > 0) {
        const rows = uploaded.map(({ path, file }) => ({
          message_id: newMessage.id,
          uploaded_by: currentUserId,
          storage_path: path,
          file_name: file.name,
          content_type: file.type,
          file_size: file.size,
        }));
        const { data: storedAttachments, error: attachmentError } = await supabase
          .from("message_attachments")
          .insert(rows)
          .select("id, message_id, storage_path, file_name, content_type");
        if (attachmentError) {
          throw new Error(`Beskeden blev gemt, men billederne kunne ikke knyttes til den: ${attachmentError.message}. Kontakt support.`);
        }
        setAttachments((current) => [...current, ...((storedAttachments ?? []) as MessageAttachment[])]);
      }

      setMessages((current) => [...current, newMessage as ChatMessage]);
      setMessageBody("");
      for (const item of pendingImages) {
        URL.revokeObjectURL(item.previewUrl);
        selectedImageUrlsRef.current = selectedImageUrlsRef.current.filter((url) => url !== item.previewUrl);
      }
      setPendingImages([]);
      const { error: updateError } = await supabase.from("conversations")
        .update({ updated_at: new Date().toISOString() }).eq("id", conversation.id);
      if (updateError) console.error("Kunne ikke opdatere samtalen:", updateError);
      await triggerChatEmail({ type: "new-message", messageId: newMessage.id });
    } catch (error) {
      console.error("Kunne ikke sende beskeden:", error);
      setErrorMessage(error instanceof Error ? error.message : "Beskeden kunne ikke sendes.");
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

      setErrorMessage(

        "Kun modtageren kan acceptere eller afslå buddet."

      );

      return;

    }

    try {

      setOfferActionLoading(offer.id);

      setErrorMessage("");

      if (newStatus === "accepted") {

        const { error: acceptError } = await supabase.rpc(

          "accept_offer_and_add_to_cart",

          {

            p_offer_id: offer.id,

          }

        );

        if (acceptError) throw acceptError;

      } else {

        const { error: updateError } = await supabase

          .from("offers")

          .update({

            status: newStatus,

            updated_at: new Date().toISOString(),

          })

          .eq("id", offer.id)

          .eq("status", "pending");

        if (updateError) throw updateError;

      }

      const body =

        newStatus === "accepted"

          ? `Buddet på ${Number(offer.amount).toLocaleString("da-DK")} kr. blev accepteret.`

          : `Buddet på ${Number(offer.amount).toLocaleString("da-DK")} kr. blev afslået.`;

      const {

        data: statusMessage,

        error: messageError,

      } = await supabase

        .from("messages")

        .insert({

          conversation_id: offer.conversation_id,

          sender_id: currentUserId,

          body,

          message_type:

            newStatus === "accepted"

              ? "offer_accepted"

              : "offer_declined",

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

        .update({

          updated_at: new Date().toISOString(),

        })

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

      const {

        data: newMessage,

        error: messageError,

      } = await supabase

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

      const {

        data: newOffer,

        error: newOfferError,

      } = await supabase

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

        await supabase

          .from("messages")

          .delete()

          .eq("id", newMessage.id);

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

        .update({

          updated_at: new Date().toISOString(),

        })

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

            <p className="mt-3 text-red-700">

              {errorMessage}

            </p>

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

                  {conversation.listing?.title ??

                    (conversation.listing_id

                      ? "Annonce"

                      : "Direkte samtale")}

                </h1>

                {otherProfile ? (

                  <Link

                    href={`/profile/${otherProfile.id}`}

                    aria-label={`Se ${profileName}s profil`}

                    className="mt-3 inline-flex items-center gap-2 rounded-lg transition hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d4af37]"

                  >

                    <ProfileAvatar

                      avatarUrl={otherProfile.avatar_url}

                      profileName={profileName}

                    />

                    <span className="truncate text-sm text-white/70 hover:text-white hover:underline">

                      {profileName}

                    </span>

                  </Link>

                ) : (

                  <div className="mt-3 flex items-center gap-2">

                    <ProfileAvatar

                      avatarUrl={null}

                      profileName={profileName}

                    />

                    <span className="truncate text-sm text-white/70">

                      {profileName}

                    </span>

                  </div>

                )}

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

                              {offer.parent_offer_id

                                ? "Modbud"

                                : "Bud"}

                            </p>

                            <p className="mt-1 font-serif text-3xl">

                              {Number(offer.amount).toLocaleString(

                                "da-DK"

                              )}{" "}

                              kr.

                            </p>

                          </div>

                          <div className="p-5">

                            {offer.message && (

                              <p className="whitespace-pre-wrap text-sm leading-6 text-stone-600">

                                {offer.message}

                              </p>

                            )}

                            <div className="mt-4 flex items-center justify-between gap-3">

                              <OfferStatusBadge

                                status={offer.status}

                              />

                              <span className="text-xs text-stone-400">

                                {new Date(

                                  offer.created_at

                                ).toLocaleString("da-DK", {

                                  dateStyle: "short",

                                  timeStyle: "short",

                                })}

                              </span>

                            </div>

                            {canRespond && (

                              <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">

                                <button

                                  type="button"

                                  disabled={

                                    offerActionLoading === offer.id

                                  }

                                  onClick={() =>

                                    handleOfferStatus(

                                      offer,

                                      "declined"

                                    )

                                  }

                                  className="rounded-full border border-red-200 px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"

                                >

                                  Afslå

                                </button>

                                <button

                                  type="button"

                                  disabled={

                                    offerActionLoading === offer.id

                                  }

                                  onClick={() =>

                                    openCounterOffer(offer)

                                  }

                                  className="rounded-full border border-[#d4af37] px-4 py-2.5 text-sm font-medium text-[#063f32] transition hover:bg-[#f4ead0] disabled:opacity-50"

                                >

                                  Modbud

                                </button>

                                <button

                                  type="button"

                                  disabled={

                                    offerActionLoading === offer.id

                                  }

                                  onClick={() =>

                                    handleOfferStatus(

                                      offer,

                                      "accepted"

                                    )

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

                        isOwnMessage

                          ? "justify-end"

                          : "justify-start"

                      }`}

                    >

                      <div

                        className={`max-w-[82%] rounded-[22px] px-4 py-3 shadow-sm ${

                          isOwnMessage

                            ? "rounded-br-md bg-[#063f32] text-white"

                            : "rounded-bl-md border border-[#eadfcb] bg-white text-[#063f32]"

                        }`}

                      >

                        {attachments.filter((attachment) => attachment.message_id === message.id).map((attachment) => (
                          <div key={attachment.id} className="mb-2">
                            {privateImageUrls[attachment.id] ? (
                              <a href={privateImageUrls[attachment.id]} target="_blank" rel="noreferrer" aria-label={`Åbn ${attachment.file_name}`}>
                                {/* Almindeligt img er nødvendigt til lokale blob-URL'er fra privat Storage. */}
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={privateImageUrls[attachment.id]} alt={attachment.file_name} className="max-h-80 max-w-full rounded-xl object-contain" />
                              </a>
                            ) : (
                              <p className="text-xs opacity-70">Henter billede...</p>
                            )}
                          </div>
                        ))}
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

                          {new Date(

                            message.created_at

                          ).toLocaleTimeString("da-DK", {

                            hour: "2-digit",

                            minute: "2-digit",

                          })}

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

              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden"
                onChange={(event) => { void chooseImages(event.target.files); }} />
              {pendingImages.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {pendingImages.map((item) => (
                    <div key={item.id} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.previewUrl} alt="Billede klar til afsendelse" className="h-20 w-20 rounded-lg border object-cover" />
                      <button type="button" onClick={() => removePendingImage(item.id)} disabled={sending}
                        aria-label="Fjern billede" className="absolute -right-1 -top-1 rounded-full bg-[#063f32] px-2 py-0.5 text-white">×</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-3">

                <label

                  htmlFor="message"

                  className="sr-only"

                >

                  Skriv en besked

                </label>

                <button type="button" title="Vedhæft billeder" aria-label="Vedhæft billeder" disabled={sending || preparingImages || pendingImages.length >= 5}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-12 w-12 flex-none items-center justify-center rounded-full border border-[#d9ccb4] text-xl text-[#063f32] disabled:opacity-40"><ImagePlus className="h-5 w-5" aria-hidden="true" /></button>
                <textarea

                  id="message"

                  value={messageBody}

                  onChange={(event) =>

                    setMessageBody(event.target.value)

                  }

                  rows={4}

                  maxLength={2000}

                  placeholder={`Skriv en besked til ${profileName}...`}

                  className="max-h-80 min-h-32 flex-1 resize-y rounded-2xl border border-[#d9ccb4] bg-[#fbfaf7] px-4 py-3 text-[15px] text-[#063f32] outline-none transition placeholder:text-stone-400 focus:border-[#063f32] focus:ring-2 focus:ring-[#063f32]/10"

                />

                <button

                  type="submit"

                  disabled={(!messageBody.trim() && pendingImages.length === 0) || sending || preparingImages}

                  className="flex h-12 flex-none items-center justify-center rounded-full bg-[#063f32] px-6 font-medium text-white transition hover:bg-[#052f26] disabled:cursor-not-allowed disabled:opacity-40"

                >

                  {sending ? "Sender..." : "Send"}

                </button>

              </div>

              <p className="mt-2 px-1 text-xs text-stone-400">

                Tryk Enter for at lave en ny linje. Beskeden sendes, når du trykker på Send.

              </p>

            </form>

          </div>

        </div>

        {counterOfferOpen && counterOfferParent && (

          <div

            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm"

            onClick={() => {

              if (!offerActionLoading) {

                setCounterOfferOpen(false);

              }

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

                    {Number(

                      counterOfferParent.amount

                    ).toLocaleString("da-DK")}{" "}

                    kr.

                  </p>

                </div>

                <button

                  type="button"

                  disabled={Boolean(offerActionLoading)}

                  onClick={() =>

                    setCounterOfferOpen(false)

                  }

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

                        setCounterOfferAmount(

                          event.target.value

                        )

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

                      setCounterOfferMessage(

                        event.target.value

                      )

                    }

                    placeholder="Valgfri besked..."

                    className="w-full resize-none rounded-2xl border border-[#d9ccb4] bg-white px-4 py-3.5 text-[#063f32] outline-none focus:border-[#063f32]"

                  />

                </div>

                <div className="flex gap-3">

                  <button

                    type="button"

                    disabled={Boolean(offerActionLoading)}

                    onClick={() =>

                      setCounterOfferOpen(false)

                    }

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

                    {offerActionLoading

                      ? "Sender..."

                      : "Send modbud"}

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

    pending:

      "border-amber-200 bg-amber-50 text-amber-800",

    accepted:

      "border-green-200 bg-green-50 text-green-800",

    declined:

      "border-red-200 bg-red-50 text-red-700",

    withdrawn:

      "border-stone-200 bg-stone-100 text-stone-600",

    superseded:

      "border-blue-200 bg-blue-50 text-blue-700",

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

// Samme indlæsningsprincip som i sell, men billedets proportioner bevares.
async function prepareChatImage(sourceFile: File): Promise<File> {
  const image = await loadChatImageSource(sourceFile);
  try {
    const scale = Math.min(1, 1800 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Browseren kunne ikke klargøre billedet.");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image.source, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Billedet kunne ikke gemmes.")), "image/webp", 0.9);
    });
    if (blob.size > 10 * 1024 * 1024) throw new Error("Billedet er for stort (maks. 10 MB).");
    return new File([blob], `${crypto.randomUUID()}.webp`, { type: "image/webp" });
  } finally {
    image.close();
  }
}

async function loadChatImageSource(file: File): Promise<{
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
}> {
  if ("createImageBitmap" in window) {
    const bitmap = await createImageBitmap(file);
    return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
  }
  const url = URL.createObjectURL(file);
  try {
    const element = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Billedet kunne ikke indlæses."));
      image.src = url;
    });
    return { source: element, width: element.naturalWidth, height: element.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}
