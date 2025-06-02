import React from "react";
import { listConversations } from "@/packages/api/conversations";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

interface Conversation {
  id: string;
  name: string | null;
  created_at: string;
  updated_at: string;
  message_count: number;
}

async function getDashboardData(token: string) {
  "use server";
  const conversations = (await listConversations(
    token
  )) as unknown as Conversation[];

  const totalMessages = conversations.reduce(
    (acc, conv) => acc + (conv.message_count || 0),
    0
  );
  const activeConversations = conversations.filter(
    (conv) =>
      new Date(conv.updated_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
  ).length;

  const avgMessagesPerConversation =
    conversations.length > 0
      ? Math.round(totalMessages / conversations.length)
      : 0;

  return {
    totalConversations: conversations.length,
    totalMessages,
    activeConversations,
    avgMessagesPerConversation,
    recentConversations: conversations
      .sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )
      .slice(0, 5),
  };
}

export default async function DashboardPage() {
  return <DashboardClient getDashboardData={getDashboardData} />;
}
