"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { AssistantChat } from "@/components/assistant-chat";

interface ConversationSummary {
  id: string;
  name: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface AssistantData {
  conversationSummaries: ConversationSummary[];
  totalConversations: number;
  totalMessages: number;
}

interface AssistantClientProps {
  getAssistantData: (token: string) => Promise<AssistantData>;
}

export function AssistantClient({ getAssistantData }: AssistantClientProps) {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<AssistantData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      if (!user || !token) {
        router.push("/login");
        return;
      }

      getAssistantData(token)
        .then(setData)
        .catch(console.error)
        .finally(() => setIsLoadingData(false));
    }
  }, [user, token, isLoading, getAssistantData, router]);

  if (isLoading || isLoadingData || !data) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-8 w-48 bg-muted rounded" />
              <div className="h-4 w-64 bg-muted rounded" />
            </div>
            <div className="flex gap-2">
              <div className="h-20 w-32 bg-muted rounded" />
              <div className="h-20 w-32 bg-muted rounded" />
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-1 h-96 bg-muted rounded" />
            <div className="md:col-span-2 h-96 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Assistant</h1>
          <p className="text-muted-foreground">
            Get insights about your conversations and analytics
          </p>
        </div>
        <div className="flex gap-2">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm font-medium">Total Conversations</div>
              <div className="text-2xl font-bold">
                {data.totalConversations}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm font-medium">Total Messages</div>
              <div className="text-2xl font-bold">{data.totalMessages}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Suggested Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Try asking about:</p>
              <ul className="space-y-2">
                <li className="text-sm">
                  • What are my most active conversation topics?
                </li>
                <li className="text-sm">
                  • Show me my conversation activity trends
                </li>
                <li className="text-sm">
                  • What are the key insights from my recent conversations?
                </li>
                <li className="text-sm">
                  • How has my conversation pattern changed over time?
                </li>
                <li className="text-sm">
                  • What are the common themes in my conversations?
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Chat with AI Assistant</CardTitle>
          </CardHeader>
          <CardContent>
            <AssistantChat
              initialData={data.conversationSummaries}
              token={token!}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
