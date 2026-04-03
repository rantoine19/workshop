"use client";

import { useState, useEffect, useCallback } from "react";

export interface ChatSession {
  id: string;
  title: string;
  report_id: string | null;
  created_at: string;
  updated_at: string;
  message_count: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ChatSidebarProps {
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  /** Incremented by parent to signal the sidebar should refresh */
  refreshKey?: number;
}

export function ChatSidebar({
  activeSessionId,
  onSelectSession,
  onNewChat,
  refreshKey,
}: ChatSidebarProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchSessions = useCallback(async (page: number) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/chat/sessions?page=${page}&limit=5`
      );
      if (!response.ok) throw new Error("Failed to load sessions");

      const data = await response.json();
      setSessions(data.sessions || []);
      setPagination(data.pagination);
    } catch {
      // Silently fail — sidebar is non-critical
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load sessions on mount and when refreshKey changes
  useEffect(() => {
    fetchSessions(1);
  }, [fetchSessions, refreshKey]);

  const handlePageChange = (newPage: number) => {
    fetchSessions(newPage);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      {/* Mobile toggle button */}
      <button
        className="chat-sidebar__toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close chat history" : "Open chat history"}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {isOpen ? (
            <path
              d="M6 6L14 14M14 6L6 14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ) : (
            <>
              <path d="M3 5H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M3 10H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M3 15H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </>
          )}
        </svg>
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="chat-sidebar__overlay"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`chat-sidebar ${isOpen ? "chat-sidebar--open" : ""}`}
        aria-label="Chat history"
      >
        <div className="chat-sidebar__header">
          <h2 className="chat-sidebar__title">Chat History</h2>
          <button
            className="chat-sidebar__new-btn"
            onClick={() => {
              onNewChat();
              setIsOpen(false);
            }}
          >
            + New Chat
          </button>
        </div>

        <div className="chat-sidebar__list">
          {isLoading && sessions.length === 0 && (
            <div className="chat-sidebar__loading">Loading...</div>
          )}

          {!isLoading && sessions.length === 0 && (
            <div className="chat-sidebar__empty">
              No conversations yet. Start a new chat!
            </div>
          )}

          {sessions.map((session) => (
            <button
              key={session.id}
              className={`chat-sidebar__item ${
                activeSessionId === session.id
                  ? "chat-sidebar__item--active"
                  : ""
              }`}
              onClick={() => {
                onSelectSession(session.id);
                setIsOpen(false);
              }}
              title={session.title}
            >
              <span className="chat-sidebar__item-title">
                {session.title}
              </span>
              <span className="chat-sidebar__item-meta">
                <span className="chat-sidebar__item-date">
                  {formatDate(session.updated_at)}
                </span>
                {session.message_count > 0 && (
                  <span className="chat-sidebar__item-count">
                    {session.message_count} msg{session.message_count !== 1 ? "s" : ""}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>

        {pagination.totalPages > 1 && (
          <div className="chat-sidebar__pagination">
            <button
              className="chat-sidebar__page-btn"
              disabled={pagination.page <= 1}
              onClick={() => handlePageChange(pagination.page - 1)}
              aria-label="Previous page"
            >
              Prev
            </button>
            <span className="chat-sidebar__page-info">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              className="chat-sidebar__page-btn"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => handlePageChange(pagination.page + 1)}
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
