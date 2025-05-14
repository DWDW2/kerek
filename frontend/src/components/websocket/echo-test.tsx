"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SendHorizontal } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  content: string;
  timestamp: string;
  type: "sent" | "received";
}

export function EchoTest() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Connect to WebSocket
    const ws = new WebSocket("ws://localhost:8080/ws");

    ws.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
      setMessages((prev) => [
        ...prev,
        {
          content: "Connected to WebSocket server",
          timestamp: new Date().toISOString(),
          type: "received",
        },
      ]);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
      setMessages((prev) => [
        ...prev,
        {
          content: "Disconnected from WebSocket server",
          timestamp: new Date().toISOString(),
          type: "received",
        },
      ]);
    };

    ws.onmessage = (event) => {
      console.log("Received message:", event.data);
      setMessages((prev) => [
        ...prev,
        {
          content: event.data,
          timestamp: new Date().toISOString(),
          type: "received",
        },
      ]);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setMessages((prev) => [
        ...prev,
        {
          content: "WebSocket error occurred",
          timestamp: new Date().toISOString(),
          type: "received",
        },
      ]);
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !isConnected || !wsRef.current) return;

    const message = newMessage.trim();
    wsRef.current.send(message);
    setMessages((prev) => [
      ...prev,
      {
        content: message,
        timestamp: new Date().toISOString(),
        type: "sent",
      },
    ]);
    setNewMessage("");
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>WebSocket Echo Test</span>
          <span
            className={`text-xs ${
              isConnected ? "text-green-500" : "text-red-500"
            }`}
          >
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea ref={scrollRef} className="h-[400px] pr-4 mb-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.type === "sent" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    message.type === "sent"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
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
            placeholder={isConnected ? "Type a message..." : "Connecting..."}
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
