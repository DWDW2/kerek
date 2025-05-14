"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SendHorizontal, Users } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWebSocket } from "@/hooks/use-websocket";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ChatProps {
  roomId: string;
  username: string;
}

export function Chat({ roomId, username }: ChatProps) {
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { isConnected, sendMessage, joinRoom, leaveRoom, messages, error } =
    useWebSocket({
      url: "ws://localhost:8080/ws",
      onConnect: () => {
        joinRoom(roomId);
      },
      onDisconnect: () => {
        leaveRoom(roomId);
      },
    });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !isConnected) return;

    sendMessage(newMessage.trim(), roomId);
    setNewMessage("");
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Room: {roomId}
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
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex",
                  message.senderId === username
                    ? "justify-end"
                    : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[70%] rounded-lg p-3",
                    message.type === "system"
                      ? "bg-muted/50 text-muted-foreground mx-auto"
                      : message.senderId === username
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {message.type !== "system" && (
                    <p className="text-xs font-medium mb-1">
                      {message.senderId === username ? "You" : message.senderId}
                    </p>
                  )}
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {new Date(message.timestamp).toLocaleTimeString()}
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
                : error
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
