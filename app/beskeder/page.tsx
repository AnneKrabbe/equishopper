"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Header from "@/components/home/Header";
import ConversationList from "@/components/chat/ConversationList";
import EmptyInbox from "@/components/chat/EmptyInbox";
import { supabase } from "@/lib/supabase";
import type {
  InboxConversation,
  InboxProfile,
} from "@/types/chatInbox";

type ConversationQueryRow = Omit<
  InboxConversation,
  "otherProfile"
>;

export default function MessagesPage() {
  const [conversations, setConversations] = useState<
    InboxConversation[]
  >([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadConversations() {
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

        const { data, error } = await supabase
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
            ),
            messages (
              id,
              body,
              sender_id,
              created_at,
              read_at
            )
          `)
          .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
          .order("updated_at", { ascending: false });

        if (error) {
          throw error;
        }

        const conversationRows =
          (data ?? []) as unknown as ConversationQueryRow[];

        const profileIds = Array.from(
          new Set(
            conversationRows.map((conversation) =>
              conversation.buyer_id === user.id
                ? conversation.seller_id
                : conversation.buyer_id
            )
          )
        );

        let profiles: InboxProfile[] = [];

        if (profileIds.length > 0) {
          const { data: profileData, error: profileError } =
            await supabase
              .from("profiles")
              .select("id, full_name, avatar_url")
              .in("id", profileIds);

          if (profileError) {
            throw profileError;
          }

          profiles = (profileData ?? []) as InboxProfile[];
        }

        const profilesById = new Map(
          profiles.map((profile) => [profile.id, profile])
        );

        const formattedConversations = conversationRows.map(
          (conversation) => {
            const otherProfileId =
              conversation.buyer_id === user.id
                ? conversation.seller_id
                : conversation.buyer_id;

            const sortedMessages = [
              ...(conversation.messages ?? []),
            ].sort(
              (firstMessage, secondMessage) =>
                new Date(secondMessage.created_at).getTime() -
                new Date(firstMessage.created_at).getTime()
            );

            const sortedImages = [
              ...(conversation.listing?.listing_images ?? []),
            ].sort(
              (firstImage, secondImage) =>
                (firstImage.sort_order ?? 0) -
                (secondImage.sort_order ?? 0)
            );

            return {
              ...conversation,
              listing: conversation.listing
                ? {
                    ...conversation.listing,
                    listing_images: sortedImages,
                  }
                : null,
              messages: sortedMessages,
              otherProfile:
                profilesById.get(otherProfileId) ?? null,
            };
          }
        );

        formattedConversations.sort((first, second) => {
          const firstDate =
            first.messages[0]?.created_at ??
            first.updated_at ??
            first.created_at;

          const secondDate =
            second.messages[0]?.created_at ??
            second.updated_at ??
            second.created_at;

          return (
            new Date(secondDate).getTime() -
            new Date(firstDate).getTime()
          );
        });

        setConversations(formattedConversations);
      } catch (error) {
        console.error("Kunne ikke hente samtaler:", error);
        setErrorMessage("Kunne ikke hente dine samtaler.");
      } finally {
        setLoading(false);
      }
    }

    loadConversations();
  }, []);

  if (loading) {
    return (
      <>
        <Header />

        <main className="min-h-screen bg-[#fbfaf7]">
          <div className="mx-auto max-w-5xl px-5 pb-16 pt-20 sm:pt-24">
            <div className="rounded-[28px] border border-[#eadfcb] bg-white p-8 shadow-sm">
              <p className="text-stone-500">
                Henter beskeder...
              </p>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (!currentUserId) {
    return (
      <>
        <Header />

        <main className="min-h-screen bg-[#fbfaf7]">
          <div className="mx-auto max-w-5xl px-5 pb-16 pt-20 sm:pt-34">
            <div className="rounded-[32px] border border-[#eadfcb] bg-white p-8 shadow-sm sm:p-12">
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#b79a3d]">
                Din indbakke
              </p>

              <h1 className="mt-3 font-serif text-4xl text-[#063f32]">
                Beskeder
              </h1>

              <p className="mt-4 max-w-lg leading-7 text-stone-600">
                Du skal være logget ind for at se dine samtaler med
                købere og sælgere.
              </p>

              <Link
                href="/login"
                className="mt-7 inline-flex rounded-full bg-[#063f32] px-7 py-3 font-medium text-white transition hover:bg-[#052f26]"
              >
                Log ind
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#fbfaf7] pb-20 pt-10 sm:pt-10">
        <section className="bg-[#063f32]">
          <div className="mx-auto max-w-5xl px-5 pb-14 pt-20 sm:pb-16 sm:pt-28">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#d4af37]">
              Din indbakke
            </p>

            <h1 className="mt-3 font-serif text-4xl text-white sm:text-5xl">
              Beskeder
            </h1>

            <p className="mt-4 max-w-xl leading-7 text-white/70">
              Her finder du dine samtaler med købere og sælgere på
              Equishopper.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-5">
          <div className="-mt-7 sm:-mt-8">
            {errorMessage && (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
                {errorMessage}
              </div>
            )}

            {conversations.length === 0 ? (
              <EmptyInbox />
            ) : (
              <ConversationList
                conversations={conversations}
                currentUserId={currentUserId}
              />
            )}
          </div>
        </div>
      </main>
    </>
  );
}