"use server";
import { listConversations } from "./conversations";
import { Conversation } from "@/types/conversation";

export async function getDashboardData(token: string) {
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

export async function getProfileData(token: string) {
  const conversations = (await listConversations(
    token
  )) as unknown as Conversation[];
  const totalMessages = conversations.reduce(
    (acc, conv) => acc + (conv.message_count || 0),
    0
  );
  const firstConversation =
    conversations.length > 0
      ? new Date(
          Math.min(
            ...conversations.map((c) => new Date(c.created_at).getTime())
          )
        )
      : null;

  const daysActive = firstConversation
    ? Math.ceil(
        (Date.now() - firstConversation.getTime()) / (1000 * 60 * 60 * 24)
      )
    : 0;

  const avgMessagesPerDay =
    daysActive > 0 ? Math.round(totalMessages / daysActive) : 0;

  return {
    totalConversations: conversations.length,
    totalMessages,
    daysActive,
    avgMessagesPerDay,
    conversationsByMonth: conversations.reduce((acc, conv) => {
      const month = new Date(conv.created_at).toLocaleString("en-US", {
        month: "long",
      });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };
}

export async function getAssistantData(token: string) {
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
