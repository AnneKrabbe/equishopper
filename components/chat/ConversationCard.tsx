import Link from "next/link";
import type {
  InboxConversation,
  InboxMessage,
} from "@/types/chatInbox";

type ConversationCardProps = {
  conversation: InboxConversation;
  currentUserId: string;
  showBorder: boolean;
};

export default function ConversationCard({
  conversation,
  currentUserId,
  showBorder,
}: ConversationCardProps) {
  const lastMessage = conversation.messages[0] ?? null;

  const unreadCount = conversation.messages.filter(
    (message) =>
      message.sender_id !== currentUserId &&
      message.read_at === null
  ).length;

  const conversationDate =
    lastMessage?.created_at ??
    conversation.updated_at ??
    conversation.created_at;

  const listingImage = getFirstListingImage(conversation);
  const profile = conversation.otherProfile;
  const profileName = profile?.full_name?.trim() || "Equishopper-bruger";

  return (
    <Link
      href={`/beskeder/${conversation.id}`}
      className={`group flex items-center gap-4 p-5 transition hover:bg-[#fbfaf7] sm:gap-5 sm:p-6 ${
        showBorder ? "border-b border-[#eadfcb]" : ""
      }`}
    >
      <div className="relative h-20 w-20 flex-none overflow-hidden rounded-2xl bg-[#edf3ef] sm:h-24 sm:w-24">
        {listingImage ? (
          <div
            role="img"
            aria-label={conversation.listing?.title ?? "Annoncebillede"}
            className="h-full w-full bg-cover bg-center transition duration-300 group-hover:scale-105"
            style={{
              backgroundImage: `url("${listingImage}")`,
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#063f32] font-serif text-2xl text-[#d4af37]">
            {getInitial(conversation.listing?.title)}
          </div>
        )}

        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#d4af37] px-1.5 text-[11px] font-bold text-[#063f32] ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2
              className={`truncate text-base text-[#063f32] transition group-hover:text-[#0b5c49] sm:text-lg ${
                unreadCount > 0 ? "font-bold" : "font-semibold"
              }`}
            >
              {conversation.listing?.title ?? "Annonce"}
            </h2>

            <div className="mt-2 flex items-center gap-2">
              <ProfileAvatar
                avatarUrl={profile?.avatar_url}
                profileName={profileName}
              />

              <p className="truncate text-sm text-stone-500">
                {profileName}
              </p>
            </div>
          </div>

          <span className="flex-none text-xs text-stone-400">
            {formatConversationDate(conversationDate)}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <p
            className={`min-w-0 truncate text-sm ${
              unreadCount > 0
                ? "font-semibold text-[#063f32]"
                : "text-stone-600"
            }`}
          >
            {getMessagePreview(lastMessage, currentUserId)}
          </p>

          <span className="flex-none text-lg text-[#b79a3d] transition-transform group-hover:translate-x-1">
            →
          </span>
        </div>
      </div>
    </Link>
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
        className="h-7 w-7 flex-none rounded-full bg-cover bg-center"
        style={{
          backgroundImage: `url("${avatarUrl}")`,
        }}
      />
    );
  }

  return (
    <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-[#063f32] text-[10px] font-bold text-white">
      {getInitial(profileName)}
    </div>
  );
}

function getFirstListingImage(conversation: InboxConversation) {
  const images = [...(conversation.listing?.listing_images ?? [])];

  images.sort(
    (firstImage, secondImage) =>
      (firstImage.sort_order ?? 0) -
      (secondImage.sort_order ?? 0)
  );

  return images[0]?.image_url ?? null;
}

function getMessagePreview(
  message: InboxMessage | null,
  currentUserId: string
) {
  if (!message) {
    return "Ingen beskeder endnu – åbn samtalen for at skrive.";
  }

  const prefix =
    message.sender_id === currentUserId ? "Dig: " : "";

  return `${prefix}${message.body}`;
}

function getInitial(value?: string | null) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return "E";
  }

  return trimmedValue.charAt(0).toUpperCase();
}

function formatConversationDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const today = new Date();

  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString("da-DK", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return "I går";
  }

  return date.toLocaleDateString("da-DK", {
    day: "2-digit",
    month: "short",
  });
}