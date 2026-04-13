"use client";

import { useCallback } from "react";
import type { ChatMessage } from "@/hooks/useChat";
import type { UseVoiceOutputReturn } from "@/hooks/useVoiceOutput";

interface MessageBubbleProps {
  message: ChatMessage;
  voiceOutput?: UseVoiceOutputReturn;
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

export function MessageBubble({ message, voiceOutput }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isStreaming = message.isStreaming ?? false;
  const isAssistant = message.role === "assistant";
  const showSpeaker = isAssistant && !isStreaming && voiceOutput?.isSupported;

  const handleSpeak = useCallback(() => {
    if (!voiceOutput) return;
    if (voiceOutput.isSpeaking) {
      voiceOutput.stop();
    } else {
      voiceOutput.speak(message.content);
    }
  }, [voiceOutput, message.content]);

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
        <div className="message-bubble__footer">
          {!isStreaming && (
            <span className="message-time">
              {message.timestamp.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          {showSpeaker && (
            <button
              type="button"
              className={`message-bubble__speak-btn${voiceOutput.isSpeaking ? " message-bubble__speak-btn--speaking" : ""}`}
              onClick={handleSpeak}
              aria-label={voiceOutput.isSpeaking ? "Stop speaking" : "Read aloud"}
              title={voiceOutput.isSpeaking ? "Stop speaking" : "Read aloud"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
