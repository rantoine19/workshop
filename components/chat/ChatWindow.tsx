"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@/hooks/useChat";
import { MessageBubble, BotAvatar } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { ChatSidebar } from "./ChatSidebar";
import NavHeader from "@/components/ui/NavHeader";

interface ChatWindowProps {
  reportId?: string;
}

export function ChatWindow({ reportId }: ChatWindowProps) {
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    sessionId,
    switchSession,
    startNewChat,
  } = useChat({ reportId });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Refresh sidebar when messages change (new message sent or session loaded)
  const prevMessageCountRef = useRef(0);
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      setSidebarRefreshKey((k) => k + 1);
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length]);

  return (
    <div className="chat-layout">
      <ChatSidebar
        activeSessionId={sessionId}
        onSelectSession={switchSession}
        onNewChat={startNewChat}
        refreshKey={sidebarRefreshKey}
      />

      <div className="chat-window">
        <NavHeader backLabel="Dashboard" />
        <div className="chat-disclaimer">
          This AI helps you understand your health data in simple language. It
          does not provide medical advice, diagnoses, or treatment
          recommendations. Always consult your healthcare provider.
        </div>

        <div className="chat-messages" role="log" aria-live="polite">
          {messages.length === 0 && !isLoading && (
            <div className="chat-welcome">
              <h2>Welcome to HealthChat AI</h2>
              <p>
                Ask me anything about your lab results or medical reports.
                I&apos;ll explain things in plain, simple language.
              </p>
              <div className="chat-suggestions">
                <p>Try asking:</p>
                <ul>
                  <li>&quot;What does my cholesterol level mean?&quot;</li>
                  <li>&quot;Are any of my results outside the normal range?&quot;</li>
                  <li>&quot;What questions should I ask my doctor?&quot;</li>
                </ul>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {isLoading && (
            <div className="message-bubble-row message-assistant">
              <BotAvatar />
              <div className="message-bubble bubble-assistant">
                <div className="typing-indicator" aria-label="AI is typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="chat-error">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <ChatInput onSend={sendMessage} disabled={isLoading} />
      </div>
    </div>
  );
}
