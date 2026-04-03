"use client";

import { useState, useCallback, useRef } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface UseChatOptions {
  reportId?: string;
}

interface SSEEvent {
  type: "session_id" | "text_delta" | "done" | "error";
  session_id?: string;
  text?: string;
  error?: string;
}

/**
 * Parse SSE lines from a text chunk. Returns parsed events and any
 * remaining partial line that hasn't been terminated yet.
 */
export function parseSSEChunk(
  chunk: string,
  buffer: string
): { events: SSEEvent[]; remaining: string } {
  const events: SSEEvent[] = [];
  const text = buffer + chunk;
  const lines = text.split("\n");

  // The last element may be an incomplete line — keep it as the remainder
  const remaining = lines.pop() ?? "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.startsWith("data: ")) continue;
    try {
      const data = JSON.parse(trimmed.slice(6)) as SSEEvent;
      events.push(data);
    } catch {
      // Skip malformed lines
    }
  }

  return { events, remaining };
}

export function useChat(options: UseChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      setError(null);

      // Add user message immediately
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: content.trim(),
        timestamp: new Date(),
      };

      const assistantMessageId = `assistant-${Date.now()}`;
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content.trim(),
            session_id: sessionId,
            report_id: options.reportId,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          let errorMessage = "Failed to send message";
          try {
            const data = await response.json();
            errorMessage = data.error || errorMessage;
          } catch {
            // Response may not be JSON for SSE errors
          }
          throw new Error(errorMessage);
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = "";
        let streamingStarted = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const { events, remaining } = parseSSEChunk(chunk, sseBuffer);
          sseBuffer = remaining;

          for (const event of events) {
            if (event.type === "session_id" && event.session_id) {
              setSessionId(event.session_id);
            } else if (event.type === "text_delta" && event.text) {
              if (!streamingStarted) {
                streamingStarted = true;
                setIsLoading(false);
                // Add the assistant message with first chunk
                setMessages((prev) => [
                  ...prev,
                  {
                    id: assistantMessageId,
                    role: "assistant",
                    content: event.text!,
                    timestamp: new Date(),
                    isStreaming: true,
                  },
                ]);
              } else {
                // Append text to existing assistant message
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: msg.content + event.text! }
                      : msg
                  )
                );
              }
            } else if (event.type === "done") {
              // Mark streaming as complete
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, isStreaming: false }
                    : msg
                )
              );
            } else if (event.type === "error" && event.error) {
              throw new Error(event.error);
            }
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // User cancelled — not an error
          return;
        }
        const message =
          err instanceof Error ? err.message : "Something went wrong";
        setError(message);
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [isLoading, sessionId, options.reportId]
  );

  const clearChat = useCallback(() => {
    // Abort any in-flight stream
    abortRef.current?.abort();
    setMessages([]);
    setSessionId(null);
    setError(null);
  }, []);

  /** Load an existing session's messages by ID */
  const switchSession = useCallback(
    async (targetSessionId: string) => {
      // Abort any in-flight stream
      abortRef.current?.abort();
      setError(null);
      setIsLoading(true);

      try {
        const response = await fetch(
          `/api/chat/sessions/${targetSessionId}/messages`
        );

        if (!response.ok) {
          throw new Error("Failed to load session");
        }

        const data = await response.json();
        const loaded: ChatMessage[] = (data.messages || []).map(
          (msg: { id: string; role: "user" | "assistant"; content: string; created_at: string }) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.created_at),
          })
        );

        setMessages(loaded);
        setSessionId(targetSessionId);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load session";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /** Start a new chat — clears messages and session */
  const startNewChat = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setSessionId(null);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat,
    sessionId,
    switchSession,
    startNewChat,
  };
}
