"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MessageSquare,
  Users,
  Bot,
  Clock,
  TrendingUp,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

interface Conversation {
  id: string;
  name: string | null;
  created_at: string;
  updated_at: string;
  message_count: number;
}

interface DashboardData {
  totalConversations: number;
  totalMessages: number;
  activeConversations: number;
  avgMessagesPerConversation: number;
  recentConversations: Conversation[];
}

interface DashboardClientProps {
  getDashboardData: (token: string) => Promise<DashboardData>;
}

export function DashboardClient({ getDashboardData }: DashboardClientProps) {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      if (!user || !token) {
        router.push("/auth/signin");
        return;
      }

      getDashboardData(token)
        .then(setData)
        .catch(console.error)
        .finally(() => setIsLoadingData(false));
    }
  }, [user, token, isLoading, getDashboardData, router]);

  if (isLoading || isLoadingData || !data) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded" />
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <div className="col-span-4 h-96 bg-muted rounded" />
            <div className="col-span-3 h-96 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: "Total Conversations",
      value: data.totalConversations,
      icon: MessageSquare,
      description: "All time conversations",
    },
    {
      title: "Total Messages",
      value: data.totalMessages,
      icon: Activity,
      description: "Messages exchanged",
    },
    {
      title: "Active Conversations",
      value: data.activeConversations,
      icon: Users,
      description: "Last 7 days",
    },
    {
      title: "Avg Messages/Conv",
      value: data.avgMessagesPerConversation,
      icon: TrendingUp,
      description: "Average per conversation",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button asChild>
          <Link href="/dashboard/conversations/new">New Conversation</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Conversations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentConversations.map((conversation) => (
                <Link
                  key={conversation.id}
                  href={`/dashboard/conversations/${conversation.id}`}
                  className="block p-4 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">
                        {conversation.name || "Untitled Conversation"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {conversation.message_count} messages
                      </p>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="mr-1 h-4 w-4" />
                      {new Date(conversation.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>AI Assistant</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Get insights about your conversations and analytics with our AI
                assistant.
              </p>
              <Button asChild className="w-full">
                <Link href="/dashboard/assistant">
                  <Bot className="mr-2 h-4 w-4" />
                  Chat with AI Assistant
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
