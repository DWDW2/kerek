import React from "react";
import { AssistantClient } from "./assistant-client";
import { listConversations } from "@/server/conversations";

interface Conversation {
  id: string;
  name: string | null;
  created_at: string;
  updated_at: string;
  message_count: number;
}

async function getAssistantData(token: string) {
  "use server";

  const conversations = (await listConversations(
    token
  )) as unknown as Conversation[];

  const conversationSummaries = conversations.map((conv) => ({
    id: conv.id,
    name: conv.name || "Untitled Conversation",
    messageCount: conv.message_count || 0,
    createdAt: conv.created_at,
    updatedAt: conv.updated_at,
  }));

  return {
    conversationSummaries,
    totalConversations: conversations.length,
    totalMessages: conversations.reduce(
      (acc, conv) => acc + (conv.message_count || 0),
      0
    ),
  };
}

export default async function AssistantPage() {
  return <AssistantClient getAssistantData={getAssistantData} />;
}
