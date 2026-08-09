type MessageBubbleProps = {
  body: string;
  createdAt: string;
  isOwnMessage: boolean;
};

export default function MessageBubble({
  body,
  createdAt,
  isOwnMessage,
}: MessageBubbleProps) {
  const time = new Date(createdAt).toLocaleTimeString("da-DK", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`flex ${
        isOwnMessage ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`max-w-[80%] rounded-3xl px-5 py-3 shadow-sm ${
          isOwnMessage
            ? "bg-[#063f32] text-white"
            : "bg-white border border-[#eadfcb] text-[#063f32]"
        }`}
      >
        <p className="whitespace-pre-wrap break-words text-[15px] leading-6">
          {body}
        </p>

        <p
          className={`mt-2 text-right text-xs ${
            isOwnMessage ? "text-white/70" : "text-stone-400"
          }`}
        >
          {time}
        </p>
      </div>
    </div>
  );
}