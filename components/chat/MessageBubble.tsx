import type { ChatMessage } from "@/hooks/useChat";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function BotAvatar() {
  return (
    <div className="bot-avatar" aria-hidden="true">
      <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Robot head */}
        <rect x="6" y="10" width="24" height="20" rx="6" fill="#65a30d" />
        {/* Antenna */}
        <line x1="18" y1="10" x2="18" y2="4" stroke="#65a30d" strokeWidth="2" strokeLinecap="round" />
        <circle cx="18" cy="3" r="2.5" fill="#65a30d" />
        {/* Eyes */}
        <circle cx="13" cy="18" r="3" fill="white" />
        <circle cx="23" cy="18" r="3" fill="white" />
        <circle cx="13.8" cy="17.5" r="1.5" fill="#1e293b" />
        <circle cx="23.8" cy="17.5" r="1.5" fill="#1e293b" />
        {/* Smile */}
        <path d="M13 24 C15 27, 21 27, 23 24" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        {/* Stethoscope hint */}
        <circle cx="28" cy="26" r="2" stroke="white" strokeWidth="1" fill="none" />
        <line x1="28" y1="24" x2="28" y2="21" stroke="white" strokeWidth="1" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isStreaming = message.isStreaming ?? false;

  return (
    <div
      className={`message-bubble-row ${isUser ? "message-user" : "message-assistant"}`}
    >
      {!isUser && <BotAvatar />}
      <div className={`message-bubble ${isUser ? "bubble-user" : "bubble-assistant"}`}>
        <div className="message-content">
          {message.content.split("\n").map((line, i) => (
            <p key={i}>{line || "\u00A0"}</p>
          ))}
          {isStreaming && (
            <span className="streaming-cursor" aria-hidden="true" />
          )}
        </div>
        {!isStreaming && (
          <span className="message-time">
            {message.timestamp.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>
    </div>
  );
}
