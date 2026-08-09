import { NextRequest, NextResponse } from "next/server";

import {
  sendCounterOfferEmail,
  sendNewMessageEmail,
  sendNewOfferEmail,
  sendOfferAcceptedEmail,
  sendOfferRejectedEmail,
} from "@/lib/email/email-service";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type EmailType =
  | "new-message"
  | "new-offer"
  | "counter-offer"
  | "offer-accepted"
  | "offer-rejected";

type RequestBody = {
  conversationId?: string;
  type?: EmailType;
  messageId?: string;
  offerId?: string;
};

type ConversationRow = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
};

type ListingRow = {
  id: string;
  title: string;
  price: number | string;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  message_type: string;
};

type OfferRow = {
  id: string;
  listing_id: string;
  conversation_id: string;
  buyer_id: string;
  seller_id: string;
  message_id: string | null;
  parent_offer_id: string | null;
  amount: number | string;
  message: string | null;
  status: string;
};

const siteUrl =
  (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://equishopper.dk"
  ).replace(/\/$/, "");

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "Du skal være logget ind." },
        { status: 401 },
      );
    }

    const body = (await request.json()) as RequestBody;
    const conversationId = body.conversationId?.trim();
    const type = body.type;

    if (!conversationId || !isUuid(conversationId)) {
      return NextResponse.json(
        { error: "Samtale-id er ugyldigt." },
        { status: 400 },
      );
    }

    if (!isEmailType(type)) {
      return NextResponse.json(
        { error: "Mailtypen er ugyldig." },
        { status: 400 },
      );
    }

    const { data: conversationData, error: conversationError } =
      await supabaseAdmin
        .from("conversations")
        .select(`
          id,
          listing_id,
          buyer_id,
          seller_id
        `)
        .eq("id", conversationId)
        .maybeSingle();

    if (conversationError) {
      throw conversationError;
    }

    if (!conversationData) {
      return NextResponse.json(
        { error: "Samtalen blev ikke fundet." },
        { status: 404 },
      );
    }

    const conversation = conversationData as ConversationRow;

    if (
      conversation.buyer_id !== user.id &&
      conversation.seller_id !== user.id
    ) {
      return NextResponse.json(
        { error: "Du har ikke adgang til denne samtale." },
        { status: 403 },
      );
    }

    const { data: listingData, error: listingError } =
      await supabaseAdmin
        .from("listings")
        .select("id, title, price")
        .eq("id", conversation.listing_id)
        .maybeSingle();

    if (listingError) {
      throw listingError;
    }

    if (!listingData) {
      return NextResponse.json(
        { error: "Annoncen blev ikke fundet." },
        { status: 404 },
      );
    }

    const listing = listingData as ListingRow;

    const { data: imageData, error: imageError } =
      await supabaseAdmin
        .from("listing_images")
        .select("image_url, sort_order")
        .eq("listing_id", listing.id)
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle();

    if (imageError) {
      console.error(
        "Kunne ikke hente annoncebillede til chat-mail:",
        imageError,
      );
    }

    const listingImageUrl =
      imageData?.image_url ?? null;

    const { data: profileData, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("id, full_name, username")
        .in("id", [
          conversation.buyer_id,
          conversation.seller_id,
        ]);

    if (profileError) {
      throw profileError;
    }

    const profiles = (profileData ?? []) as ProfileRow[];
    const actorProfile =
      profiles.find((profile) => profile.id === user.id) ?? null;

    const actorName =
      getDisplayName(actorProfile) || "Equishopper-bruger";

    const conversationUrl =
      `${siteUrl}/beskeder/${conversation.id}`;

    if (type === "new-message") {
      const messageId = body.messageId?.trim();

      if (!messageId || !isUuid(messageId)) {
        return NextResponse.json(
          { error: "Besked-id er ugyldigt." },
          { status: 400 },
        );
      }

      const { data: messageData, error: messageError } =
        await supabaseAdmin
          .from("messages")
          .select(`
            id,
            conversation_id,
            sender_id,
            body,
            message_type
          `)
          .eq("id", messageId)
          .eq("conversation_id", conversation.id)
          .maybeSingle();

      if (messageError) {
        throw messageError;
      }

      if (!messageData) {
        return NextResponse.json(
          { error: "Beskeden blev ikke fundet." },
          { status: 404 },
        );
      }

      const message = messageData as MessageRow;

      if (message.sender_id !== user.id) {
        return NextResponse.json(
          { error: "Du kan kun sende mail for dine egne beskeder." },
          { status: 403 },
        );
      }

      const recipientId =
        getOtherParticipantId(conversation, user.id);

      const recipient = await getRecipient(
        recipientId,
        profiles,
      );

      const result = await sendNewMessageEmail({
        to: recipient,
        props: {
          recipientName: recipient.name ?? null,
          senderName: actorName,
          listingTitle: listing.title,
          listingImageUrl,
          message: message.body,
          conversationUrl,
        },
      });

      return NextResponse.json({
        success: true,
        emailId: result.id,
      });
    }

    const offerId = body.offerId?.trim();

    if (!offerId || !isUuid(offerId)) {
      return NextResponse.json(
        { error: "Bud-id er ugyldigt." },
        { status: 400 },
      );
    }

    const offer = await getOffer(
      offerId,
      conversation.id,
    );

    if (!offer) {
      return NextResponse.json(
        { error: "Buddet blev ikke fundet." },
        { status: 404 },
      );
    }

    const offerSenderId =
      await getOfferSenderId(offer);

    if (type === "new-offer") {
      if (offer.parent_offer_id) {
        return NextResponse.json(
          {
            error:
              "Et modbud skal sendes som mailtypen counter-offer.",
          },
          { status: 409 },
        );
      }

      if (
        offer.buyer_id !== user.id ||
        offerSenderId !== user.id
      ) {
        return NextResponse.json(
          {
            error:
              "Kun køberen, der oprettede buddet, kan udløse denne mail.",
          },
          { status: 403 },
        );
      }

      if (offer.status !== "pending") {
        return NextResponse.json(
          {
            error:
              "Kun et aktivt bud kan udløse en ny-bud-mail.",
          },
          { status: 409 },
        );
      }

      const recipient = await getRecipient(
        conversation.seller_id,
        profiles,
      );

      const result = await sendNewOfferEmail({
        to: recipient,
        props: {
          sellerName: recipient.name ?? null,
          buyerName: actorName,
          listingTitle: listing.title,
          listingImageUrl,
          listingPrice: formatMoney(listing.price),
          offerAmount: formatMoney(offer.amount),
          offerMessage: offer.message ?? undefined,
          offerUrl: conversationUrl,
        },
      });

      return NextResponse.json({
        success: true,
        emailId: result.id,
      });
    }

    if (type === "counter-offer") {
      if (offerSenderId !== user.id) {
        return NextResponse.json(
          { error: "Du kan kun sende mail for dit eget modbud." },
          { status: 403 },
        );
      }

      const recipientId =
        getOtherParticipantId(conversation, user.id);

      const recipient = await getRecipient(
        recipientId,
        profiles,
      );

      let originalOfferAmount: number | string | null = null;

      if (offer.parent_offer_id) {
        const parentOffer = await getOffer(
          offer.parent_offer_id,
          conversation.id,
        );

        originalOfferAmount = parentOffer?.amount ?? null;
      }

      const result = await sendCounterOfferEmail({
        to: recipient,
        props: {
          recipientName: recipient.name ?? null,
          senderName: actorName,
          listingTitle: listing.title,
          listingImageUrl,
          listingPrice: formatMoney(listing.price),
          originalOfferAmount:
            originalOfferAmount !== null
              ? formatMoney(originalOfferAmount)
              : formatMoney(listing.price),
          counterOfferAmount: formatMoney(offer.amount),
          counterOfferMessage: offer.message ?? undefined,
          offerUrl: conversationUrl,
        },
      });

      return NextResponse.json({
        success: true,
        emailId: result.id,
      });
    }

    /*
     * Ved accept/afslag skal den bruger, der reagerer på buddet,
     * være modtageren af buddet. Mailen sendes tilbage til den,
     * der oprindeligt sendte buddet.
     */
    const offerReceiverId =
      getOtherParticipantId(conversation, offerSenderId);

    if (offerReceiverId !== user.id) {
      return NextResponse.json(
        {
          error:
            "Kun modtageren af buddet kan udløse denne mail.",
        },
        { status: 403 },
      );
    }

    const recipient = await getRecipient(
      offerSenderId,
      profiles,
    );

    if (type === "offer-accepted") {
      if (offer.status !== "accepted") {
        return NextResponse.json(
          { error: "Buddet er ikke markeret som accepteret." },
          { status: 409 },
        );
      }

      const result = await sendOfferAcceptedEmail({
        to: recipient,
        props: {
          /*
           * De eksisterende template-props hedder buyerName/sellerName.
           * Vi bruger modtager/aktør, så mailen stadig går til den
           * korrekte part også ved et accepteret modbud.
           */
          buyerName: recipient.name ?? "Equishopper-bruger",
          sellerName: actorName,
          listingTitle: listing.title,
          listingImageUrl,
          listingPrice: formatMoney(listing.price),
          acceptedAmount: formatMoney(offer.amount),
          sellerMessage: null,
          checkoutUrl: conversationUrl,
        },
      });

      return NextResponse.json({
        success: true,
        emailId: result.id,
      });
    }

    if (offer.status !== "declined") {
      return NextResponse.json(
        { error: "Buddet er ikke markeret som afslået." },
        { status: 409 },
      );
    }

    const result = await sendOfferRejectedEmail({
      to: recipient,
      props: {
        recipientName: recipient.name ?? null,
        sellerName: actorName,
        listingTitle: listing.title,
        listingImageUrl,
        listingPrice: formatMoney(listing.price),
        offerAmount: formatMoney(offer.amount),
        browseUrl: `${siteUrl}/annoncer`,
      },
    });

    return NextResponse.json({
      success: true,
      emailId: result.id,
    });
  } catch (error) {
    console.error("Chat-mail kunne ikke sendes:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Mailen kunne ikke sendes.",
      },
      { status: 500 },
    );
  }
}

async function getAuthenticatedUser(
  request: NextRequest,
) {
  const authorization =
    request.headers.get("authorization") ?? "";

  const accessToken = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  if (!accessToken) {
    return null;
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (error || !user) {
    return null;
  }

  return user;
}

async function getOffer(
  offerId: string,
  conversationId: string,
): Promise<OfferRow | null> {
  const { data, error } = await supabaseAdmin
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
      status
    `)
    .eq("id", offerId)
    .eq("conversation_id", conversationId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as OfferRow | null) ?? null;
}

async function getOfferSenderId(
  offer: OfferRow,
) {
  if (!offer.message_id) {
    return offer.buyer_id;
  }

  const { data, error } = await supabaseAdmin
    .from("messages")
    .select("sender_id")
    .eq("id", offer.message_id)
    .eq("conversation_id", offer.conversation_id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.sender_id ?? offer.buyer_id;
}

function getOtherParticipantId(
  conversation: ConversationRow,
  userId: string,
) {
  return conversation.buyer_id === userId
    ? conversation.seller_id
    : conversation.buyer_id;
}

async function getRecipient(
  userId: string,
  profiles: ProfileRow[],
) {
  const profile =
    profiles.find((item) => item.id === userId) ?? null;

  const name =
    getDisplayName(profile) || null;

  const { data, error } =
    await supabaseAdmin.auth.admin.getUserById(userId);

  if (error) {
    throw new Error(
      `Modtagerens e-mail kunne ikke hentes: ${error.message}`,
    );
  }

  const email = data.user?.email;

  if (!email) {
    throw new Error(
      "Modtageren har ingen e-mailadresse i Supabase Auth.",
    );
  }

  return {
    email,
    name,
  };
}

function getDisplayName(
  profile: ProfileRow | null,
) {
  if (!profile) return "";

  if (profile.full_name?.trim()) {
    return profile.full_name.trim();
  }

  if (profile.username?.trim()) {
    return profile.username.trim();
  }

  return "";
}

function formatMoney(
  value: number | string,
) {
  const amount = Number(value);

  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "DKK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function isEmailType(
  value: unknown,
): value is EmailType {
  return (
    value === "new-message" ||
    value === "new-offer" ||
    value === "counter-offer" ||
    value === "offer-accepted" ||
    value === "offer-rejected"
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}