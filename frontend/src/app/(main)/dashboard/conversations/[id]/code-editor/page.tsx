"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useConversation } from "@/hooks/use-conversation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import CodeEditor from "@/components/conversations/code-editor";
import { toast } from "sonner";

export default function CodeEditorPage() {
  const { id: conversationId } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [wsError, setWsError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { conversation, isLoading: isLoadingConversation } = useConversation(
    conversationId as string
  );

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
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";
      const ws = new WebSocket(`${wsUrl}/ws/${conversationId}?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setWsError(null);
        console.log("WebSocket connected");
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log("Received message:", message);
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

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setWsError("Connection error");
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
  }, [conversationId, user?.id]);

  const sendContent = async (content: string) => {
    if (!content.trim()) {
      console.warn("Attempted to send empty content.");
      return;
    }
    if (!isConnected) {
      setWsError("Not connected. Please wait for connection to establish.");
      toast.error("Not connected to chat. Please wait...");
      return;
    }
    if (!user?.id || !conversationId) {
      setWsError(
        "User or conversation context is missing. Cannot send message."
      );
      console.error(
        "sendContent: User ID or Conversation ID is missing.",
        `User ID: ${user?.id}, Conversation ID: ${conversationId}`
      );
      return;
    }

    setIsSending(true);
    setWsError(null);

    try {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        setWsError("WebSocket is not ready. Please try again or reconnect.");
        throw new Error("WebSocket is not in OPEN state during send attempt.");
      }

      const messagePayload = {
        content,
        conversationId: conversationId,
        senderId: user.id,
      };

      wsRef.current.send(JSON.stringify(messagePayload));

      router.push(`/dashboard/conversations/${conversationId}`);
    } catch (error) {
      console.error("Failed to send message via WebSocket:", error);
      const specificError =
        error instanceof Error ? error.message : "Failed to send message.";
      setWsError(specificError);
      toast.error("Failed to send code. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleGoBack = () => {
    router.push(`/dashboard/conversations/${conversationId}`);
  };

  if (isLoadingConversation) {
    return (
      <div className="flex flex-col h-screen">
        <header className="flex items-center gap-4 p-4 border-b">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-6 w-48" />
        </header>
        <div className="flex-1 p-4">
          <Skeleton className="h-96 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-bold mb-4">Conversation not found</h1>
        <Button onClick={handleGoBack} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center gap-4 p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Button variant="ghost" size="icon" onClick={handleGoBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold">Code Editor</h1>
          <p className="text-sm text-muted-foreground">
            Write and share code with your conversation
          </p>
        </div>
        {!isConnected && (
          <div className="ml-auto">
            <div className="flex items-center gap-2 text-sm text-orange-600">
              <div className="h-2 w-2 rounded-full bg-orange-600 animate-pulse" />
              Connecting...
            </div>
          </div>
        )}
        {wsError && (
          <div className="ml-auto">
            <div className="flex items-center gap-2 text-sm text-red-600">
              <div className="h-2 w-2 rounded-full bg-red-600" />
              Connection Error
            </div>
          </div>
        )}
      </header>

      <div className="flex-1 p-4 overflow-auto">
        <CodeEditor
          isConnected={isConnected}
          isSending={isSending}
          onSendContent={sendContent}
        />
      </div>
    </div>
  );
}
