"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WebSocketMessage {
  type: "text" | "binary" | "ping";
  content: string;
  timestamp: Date;
}

export function WebSocketEcho() {
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Create WebSocket connection
    const ws = new WebSocket("ws://localhost:8080/ws/1");
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setMessages((prev) => [
        ...prev,
        {
          type: "text",
          content: "Connected to WebSocket server",
          timestamp: new Date(),
        },
      ]);
    };

    ws.onmessage = (event) => {
      setMessages((prev) => [
        ...prev,
        {
          type: "text",
          content: event.data,
          timestamp: new Date(),
        },
      ]);
    };

    ws.onclose = () => {
      setIsConnected(false);
      setMessages((prev) => [
        ...prev,
        {
          type: "text",
          content: "Disconnected from WebSocket server",
          timestamp: new Date(),
        },
      ]);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setMessages((prev) => [
        ...prev,
        {
          type: "text",
          content: "WebSocket error occurred",
          timestamp: new Date(),
        },
      ]);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  const sendMessage = () => {
    if (
      !wsRef.current ||
      wsRef.current.readyState !== WebSocket.OPEN ||
      !inputMessage.trim()
    ) {
      return;
    }

    wsRef.current.send(inputMessage);
    setInputMessage("");
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>WebSocket Echo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="text-sm text-muted-foreground">
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>

          <div className="h-[300px] overflow-y-auto border rounded-lg p-4 space-y-2">
            {messages.map((msg, index) => (
              <div key={index} className="text-sm">
                <span className="text-muted-foreground">
                  {msg.timestamp.toLocaleTimeString()}
                </span>
                <span className="ml-2">{msg.content}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type a message..."
              disabled={!isConnected}
            />
            <Button
              onClick={sendMessage}
              disabled={!isConnected || !inputMessage.trim()}
            >
              Send
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
