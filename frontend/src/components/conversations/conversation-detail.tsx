"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { SendHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useMessages } from "@/hooks/use-messages";
import { Message } from "@/types/conversation";
import { useConversation } from "@/hooks/use-conversation";

export function ConversationDetail() {
  const { id: conversationId } = useParams();
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [wsError, setWsError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const { user } = useAuth();

  const {
    messages,
    isLoading: isLoadingMessages,
    hasMore,
    isLoadingMore,
    loadOlderMessages,
    setMessages,
    mergeMessages,
  } = useMessages(conversationId as string);
  const { conversation, isLoading: isLoadingConversation } = useConversation(
    conversationId as string
  );

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user?.id || !conversationId) return;

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const token = localStorage.getItem("auth_token");
    if (!token) return;

    let shouldReconnect = true;

    function connectWS() {
      const ws = new WebSocket(
        `ws://localhost:8080/ws/${conversationId}?token=${token}`
      );
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setWsError(null);
        console.log("WebSocket connected");
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as Message;
          mergeMessages([message]);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setWsError("Connection closed");
        console.log("WebSocket disconnected");
        if (shouldReconnect) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWS();
          }, 2000);
        }
      };
    }

    connectWS();

    return () => {
      shouldReconnect = false;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [conversationId, user?.id, mergeMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const sendMessage = async (content: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not connected");
    }

    const message = {
      content,
      conversationId: conversationId,
      senderId: user?.id,
    };

    wsRef.current.send(JSON.stringify(message));

    const tempMessage: Message = {
      id: Date.now().toString(),
      content: content,
      sender_id: user?.id as string,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      conversation_id: conversationId as string,
    };
    setMessages((prev) => [...prev, tempMessage]);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !isConnected) return;

    setIsSending(true);
    try {
      await sendMessage(newMessage.trim());
      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
      setWsError("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const isLoading = isLoadingConversation || isLoadingMessages;

  if (isLoading) {
    return (
      <Card className="flex-1">
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-[200px]" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start space-x-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-4 w-[300px]" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!conversation) {
    return <div>Conversation not found</div>;
  }

  const otherParticipant = conversation.participant_ids.find(
    (p) => p !== user?.id
  );

  return (
    <Card className="h-full flex flex-col border-none shadow-none rounded-none">
      <CardHeader className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            Chat with {otherParticipant}
          </CardTitle>
          <Badge
            variant={isConnected ? "default" : "destructive"}
            className={cn(
              "transition-colors",
              isConnected ? "bg-green-500" : "bg-red-500"
            )}
          >
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea ref={scrollRef} className="flex-1 px-6">
          <div className="flex flex-col space-y-4 py-4">
            {hasMore && (
              <div className="flex justify-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={loadOlderMessages}
                  disabled={isLoadingMore}
                  className="bg-background/50 backdrop-blur-sm"
                >
                  {isLoadingMore ? "Loading..." : "Load older messages"}
                </Button>
              </div>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex w-full",
                  message.sender_id === user?.id
                    ? "justify-end"
                    : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[70%] rounded-2xl px-4 py-2.5",
                    message.sender_id === user?.id
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "bg-muted rounded-tl-none"
                  )}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <p className="text-xs mt-1 opacity-70 text-right">
                    {new Date(message.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="border-t p-4">
          <form onSubmit={handleSendMessage} className="flex space-x-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={
                isConnected
                  ? "Type a message..."
                  : wsError
                  ? "Connection error. Please try again."
                  : "Connecting..."
              }
              disabled={!isConnected || isSending}
              className="flex-1"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!isConnected || isSending}
              className="shrink-0"
            >
              <SendHorizontal className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
