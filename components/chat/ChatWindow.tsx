"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@/hooks/useChat";
import { MessageBubble, BotAvatar } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { ChatSidebar } from "./ChatSidebar";
import { ReportSelector } from "./ReportSelector";
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
    attachedReport,
    attachReport,
    detachReport,
  } = useChat({ reportId });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);
  const [selectorDismissed, setSelectorDismissed] = useState(false);

  // Show report selector when: no reportId prop, no active session, not dismissed,
  // and no report already attached
  const showReportSelector =
    !reportId && !sessionId && !selectorDismissed && !attachedReport && messages.length === 0;

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

  // Reset selector dismissed state when starting a new chat
  const prevSessionId = useRef(sessionId);
  useEffect(() => {
    if (prevSessionId.current !== null && sessionId === null) {
      setSelectorDismissed(false);
    }
    prevSessionId.current = sessionId;
  }, [sessionId]);

  // Whether there is any report context active (prop or attached)
  const hasReportContext = !!reportId || !!attachedReport;

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
          {showReportSelector && (
            <ReportSelector
              onSelect={(report) => {
                attachReport(report);
              }}
              onSkip={() => setSelectorDismissed(true)}
            />
          )}

          {messages.length === 0 && !isLoading && !showReportSelector && (
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

        {hasReportContext && attachedReport && (
          <div className="chat-report-indicator" role="status">
            <span className="chat-report-indicator__text">
              Discussing: {attachedReport.filename} ({attachedReport.date})
            </span>
            <button
              className="chat-report-indicator__remove"
              onClick={detachReport}
              type="button"
              aria-label="Detach report"
            >
              x
            </button>
          </div>
        )}

        <ChatInput onSend={sendMessage} disabled={isLoading} />
      </div>
    </div>
  );
}
