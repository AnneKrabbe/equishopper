import { supabase } from "@/lib/supabase";
import type { Conversation } from "@/types/chat";

type GetOrCreateConversationInput = {
  listingId: string;
  sellerId: string;
};

export async function getOrCreateConversation({
  listingId,
  sellerId,
}: GetOrCreateConversationInput): Promise<Conversation> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error("Du skal være logget ind for at kontakte sælgeren.");
  }

  if (user.id === sellerId) {
    throw new Error("Du kan ikke starte en samtale med dig selv.");
  }

  const { data: existingConversation, error: findError } = await supabase
    .from("conversations")
    .select("*")
    .eq("listing_id", listingId)
    .eq("buyer_id", user.id)
    .eq("seller_id", sellerId)
    .maybeSingle();

  if (findError) {
    throw findError;
  }

  if (existingConversation) {
    return existingConversation as Conversation;
  }

  const { data: newConversation, error: createError } = await supabase
    .from("conversations")
    .insert({
      listing_id: listingId,
      buyer_id: user.id,
      seller_id: sellerId,
    })
    .select("*")
    .single();

  if (createError) {
    throw createError;
  }

  return newConversation as Conversation;
}