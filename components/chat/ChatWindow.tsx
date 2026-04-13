"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
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
  const [uploadingFile, setUploadingFile] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<"uploading" | "parsing" | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

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

  /** Handle inline file upload from chat input */
  const handleFileUpload = useCallback(async (file: File) => {
    setUploadingFile(file.name);
    setUploadProgress("uploading");
    setUploadError(null);

    try {
      // 1. Upload the file
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/chat/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const data = await uploadRes.json();
        throw new Error(data.error || "Upload failed");
      }

      const { report_id, filename } = await uploadRes.json();

      // 2. Trigger parsing
      setUploadProgress("parsing");

      const parseRes = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_id }),
      });

      if (!parseRes.ok) {
        const data = await parseRes.json();
        throw new Error(data.error || "Analysis failed");
      }

      // 3. Attach the report to the chat
      attachReport({
        id: report_id,
        filename: filename || file.name,
        date: new Date().toLocaleDateString(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setUploadError(message);
    } finally {
      setUploadingFile(null);
      setUploadProgress(null);
    }
  }, [attachReport]);

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
              <div className="chat-welcome__avatar">
                <BotAvatar />
              </div>
              <h2>Hi! I&apos;m your HealthChat guide</h2>
              <p>
                Ask me anything about your health data. I can explain lab
                results, answer questions, and help you prepare for doctor
                visits.
              </p>
              <div className="chat-suggestions">
                <button
                  type="button"
                  className="chat-suggestions__chip"
                  onClick={() => sendMessage("What do my lab results mean?")}
                >
                  What do my lab results mean?
                </button>
                <button
                  type="button"
                  className="chat-suggestions__chip"
                  onClick={() => sendMessage("Help me prepare for my doctor visit")}
                >
                  Help me prepare for my doctor visit
                </button>
                <button
                  type="button"
                  className="chat-suggestions__chip"
                  onClick={() => sendMessage("Explain my cholesterol levels")}
                >
                  Explain my cholesterol levels
                </button>
                <Link
                  href="/glossary"
                  className="chat-suggestions__chip"
                >
                  Browse Health Glossary
                </Link>
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

        {uploadError && (
          <div className="chat-error">
            Upload: {uploadError}
          </div>
        )}

        <ChatInput
          onSend={sendMessage}
          disabled={isLoading}
          onFileUpload={handleFileUpload}
          uploadingFile={uploadingFile}
          uploadProgress={uploadProgress}
        />
      </div>
    </div>
  );
}
