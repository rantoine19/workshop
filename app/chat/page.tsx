"use client";

import { useSearchParams } from "next/navigation";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { Suspense } from "react";

function ChatContent() {
  const searchParams = useSearchParams();
  const reportId = searchParams.get("report_id") ?? undefined;
  const initialMessage = searchParams.get("message") ?? undefined;

  return <ChatWindow reportId={reportId} initialMessage={initialMessage} />;
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="chat-loading">Loading chat...</div>}>
      <ChatContent />
    </Suspense>
  );
}
