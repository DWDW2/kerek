"use client";
import { getConversation } from "@/lib/api/conversations";
import { ConversationDetail } from "@/components/conversations/conversation-detail";
import { notFound } from "next/navigation";

interface ConversationPageProps {
  params: {
    id: string;
  };
}

export default async function ConversationPage({
  params,
}: ConversationPageProps) {
  try {
    const conversation = await getConversation(
      params.id,
      localStorage.getItem("auth_token") || ""
    );

    return (
      <div className="container py-6">
        <div className="h-[calc(100vh-8rem)]">
          <ConversationDetail
            conversationId={params.id}
            conversation={conversation}
          />
        </div>
      </div>
    );
  } catch (error) {
    notFound();
  }
}
