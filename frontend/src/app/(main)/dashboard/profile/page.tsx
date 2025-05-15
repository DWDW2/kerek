import React from "react";
import { ProfileClient } from "./profile-client";
import { listConversations } from "@/server/conversations";

interface Conversation {
  id: string;
  name: string | null;
  created_at: string;
  updated_at: string;
  message_count: number;
}

async function getProfileData(token: string) {
  "use server";

  const conversations = (await listConversations(token)) as Conversation[];

  // Calculate user statistics
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
      const month = new Date(conv.created_at).toLocaleString("default", {
        month: "long",
      });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };
}

export default async function ProfilePage() {
  return <ProfileClient getProfileData={getProfileData} />;
}
