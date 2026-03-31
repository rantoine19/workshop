"use client";

import { useSearchParams } from "next/navigation";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { Suspense } from "react";

function ChatContent() {
  const searchParams = useSearchParams();
  const reportId = searchParams.get("report_id") ?? undefined;

  return <ChatWindow reportId={reportId} />;
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="chat-loading">Loading chat...</div>}>
      <ChatContent />
    </Suspense>
  );
}
