import MessageBubble from "./MessageBubble";

type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

type MessageListProps = {
  messages: Message[];
  currentUserId: string;
};

export default function MessageList({
  messages,
  currentUserId,
}: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-[#d9ccb4] bg-[#fbfaf7] p-10 text-center">
        <p className="text-stone-500">
          Ingen beskeder endnu.
        </p>

        <p className="mt-2 text-sm text-stone-400">
          Skriv den første besked.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          body={message.body}
          createdAt={message.created_at}
          isOwnMessage={message.sender_id === currentUserId}
        />
      ))}
    </div>
  );
}