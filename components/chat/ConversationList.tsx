import ConversationCard from "@/components/chat/ConversationCard";
import type { InboxConversation } from "@/types/chatInbox";

type ConversationListProps = {
  conversations: InboxConversation[];
  currentUserId: string;
};

export default function ConversationList({
  conversations,
  currentUserId,
}: ConversationListProps) {
  return (
    <div className="overflow-hidden rounded-[32px] border border-[#eadfcb] bg-white shadow-sm">
      {conversations.map((conversation, index) => (
        <ConversationCard
          key={conversation.id}
          conversation={conversation}
          currentUserId={currentUserId}
          showBorder={index !== conversations.length - 1}
        />
      ))}
    </div>
  );
}