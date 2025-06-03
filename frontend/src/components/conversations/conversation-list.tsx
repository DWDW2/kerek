"use client";

import { useEffect, useState } from "react";
import { Conversation } from "@/types/conversation";
import { listConversations } from "../../../packages/api/conversations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/auth-context";

export function ConversationList() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { token } = useAuth();

  useEffect(() => {
    async function loadConversations() {
      try {
        if (token) {
          const data = await listConversations(token);
          setConversations(data);
        }
      } catch (error) {
        console.error("Failed to load conversations:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadConversations();
  }, [token]);

  if (isLoading) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Conversations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-4 w-[150px]" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col border-r rounded-none shadow-none">
      <CardHeader className="border-b px-6 py-4">
        <CardTitle className="text-lg font-semibold">Conversations</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full">
          <div className="flex flex-col divide-y">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() =>
                  router.push(`/dashboard/conversations/${conversation.id}`)
                }
                className="w-full text-left px-6 py-4 hover:bg-accent/50 transition-colors focus:outline-none focus:bg-accent/50"
              >
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium truncate">
                    {conversation.name || "Unnamed Conversation"}
                  </p>
                  {conversation.last_message && (
                    <>
                      <p className="text-sm text-muted-foreground truncate">
                        {conversation.last_message.content}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(
                          new Date(conversation.last_message.created_at),
                          {
                            addSuffix: true,
                          }
                        )}
                      </p>
                    </>
                  )}
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
