"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  participant_ids: string[];
}

export function ConversationDetail() {
  const { id } = useParams();
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [wsError, setWsError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const { user } = useAuth();

  const mergeMessages = useCallback(
    (newMsgs: Message[]) => {
      setMessages((prev) => {
        const map = new Map<string, Message>();
        [...newMsgs, ...prev].forEach((msg) => map.set(msg.id, msg));
        return Array.from(map.values()).sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      });
    },
    [setMessages]
  );

  useEffect(() => {
    if (!user?.id || !id) return;

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const token = localStorage.getItem("auth_token");
    if (!token) return;

    const ws = new WebSocket(`ws://localhost:8080/ws/${id}?token=${token}`);
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
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [id, user?.id, mergeMessages]);

  useEffect(() => {
    const loadConversation = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/conversations/${id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
            },
          }
        );
        if (!response.ok) throw new Error("Failed to load conversation");
        const data = await response.json();
        setConversation(data);
      } catch (error) {
        console.error("Failed to load conversation details:", error);
      }
    };

    loadConversation();
  }, [id]);

  useEffect(() => {
    const loadMessages = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/conversations/${id}/messages?limit=20`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
            },
          }
        );
        if (!response.ok) throw new Error("Failed to load messages");
        const data = await response.json();
        setMessages(data.reverse()); // oldest first
        setHasMore(data.length === 20);
      } catch (error) {
        console.error("Failed to load messages:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const loadOlderMessages = async () => {
    if (isLoadingMore || !messages.length) return;
    setIsLoadingMore(true);
    try {
      const oldest = messages[0];
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL
        }/conversations/${id}/messages?limit=20&before=${encodeURIComponent(
          oldest.createdAt
        )}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to load older messages");
      const data = await response.json();
      if (data.length === 0) setHasMore(false);
      mergeMessages(data.reverse());
    } catch (error) {
      console.error("Failed to load older messages:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const sendMessage = async (content: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not connected");
    }

    const message = {
      content,
      conversationId: id,
      senderId: user?.id,
    };

    wsRef.current.send(JSON.stringify(message));
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
                  message.senderId === user?.id
                    ? "justify-end"
                    : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[70%] rounded-2xl px-4 py-2.5",
                    message.senderId === user?.id
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "bg-muted rounded-tl-none"
                  )}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <p className="text-xs mt-1 opacity-70 text-right">
                    {new Date(message.createdAt).toLocaleTimeString([], {
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
