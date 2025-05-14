"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SendHorizontal, Users, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWebSocket } from "@/hooks/use-websocket";
import { useMessages } from "@/hooks/use-messages";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ChatProps {
  conversationId: string;
  username: string;
  initialLimit?: number;
}

export function Chat({
  conversationId,
  username,
  initialLimit = 50,
}: ChatProps) {
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch initial messages
  const {
    messages: initialMessages,
    isLoading,
    error: fetchError,
  } = useMessages({
    conversationId,
    limit: initialLimit,
  });

  // WebSocket connection for real-time messages
  const {
    isConnected,
    sendMessage,
    joinRoom,
    leaveRoom,
    messages: wsMessages,
    error: wsError,
  } = useWebSocket({
    url: "ws://localhost:8080/ws",
    onConnect: () => {
      joinRoom(conversationId);
    },
    onDisconnect: () => {
      leaveRoom(conversationId);
    },
  });

  // Combine initial messages with WebSocket messages
  const allMessages = [...initialMessages, ...wsMessages];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [allMessages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !isConnected) return;

    sendMessage(newMessage.trim(), conversationId);
    setNewMessage("");
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="flex items-center justify-center h-[500px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Conversation: {conversationId}
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
      <CardContent>
        <ScrollArea ref={scrollRef} className="h-[500px] pr-4 mb-4">
          <div className="space-y-4">
            {allMessages.map((message, index) => (
              <div
                key={message.id || index}
                className={cn(
                  "flex",
                  message.sender_id === username
                    ? "justify-end"
                    : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[70%] rounded-lg p-3",
                    message.type === "system"
                      ? "bg-muted/50 text-muted-foreground mx-auto"
                      : message.sender_id === username
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {message.type !== "system" && (
                    <p className="text-xs font-medium mb-1">
                      {message.sender_id === username
                        ? "You"
                        : message.sender_id}
                    </p>
                  )}
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {new Date(
                      message.created_at || message.timestamp
                    ).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={
              isConnected
                ? "Type a message..."
                : wsError || fetchError
                ? "Connection error. Please try again."
                : "Connecting..."
            }
            disabled={!isConnected}
          />
          <Button type="submit" size="icon" disabled={!isConnected}>
            <SendHorizontal className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
