import { useEffect, useRef, useState, useCallback } from "react";

interface ConversationMessage {
  id: string;
  content: string;
  senderId: string;
  conversationId: string;
  createdAt: string;
}

interface UseConversationWebSocketProps {
  conversationId: string;
  userId: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

interface UseConversationWebSocketReturn {
  isConnected: boolean;
  sendMessage: (content: string) => void;
  messages: ConversationMessage[];
  lastMessage: ConversationMessage | null;
  error: Event | null;
}

export function useConversationWebSocket({
  conversationId,
  userId,
  onConnect,
  onDisconnect,
  onError,
}: UseConversationWebSocketProps): UseConversationWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [error, setError] = useState<Event | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>(null);

  const connect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const token = localStorage.getItem("auth_token");
    if (!token) {
      console.error("No auth token found");
      setError(new Event("Authentication required"));
      return;
    }

    const wsUrl = `ws://127.0.0.1:8080/ws`;
    console.log("Connecting to WebSocket:", wsUrl);

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
      setError(null);
      onConnect?.();
    };

    ws.onclose = (event) => {
      console.log("WebSocket disconnected:", event.code, event.reason);
      setIsConnected(false);
      onDisconnect?.();

      // Only attempt to reconnect if the connection was closed unexpectedly
      if (event.code !== 1000) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("Attempting to reconnect...");
          connect();
        }, 3000);
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Received WebSocket message:", data);

        if (data.type === "message") {
          const message: ConversationMessage = {
            id: data.id,
            content: data.content,
            senderId: data.senderId,
            conversationId: data.conversationId,
            createdAt: data.createdAt,
          };
          setMessages((prev) => [...prev, message]);
        } else if (data.type === "error") {
          console.error("WebSocket error message:", data.message);
          setError(new Event(data.message));
        }
      } catch (e) {
        console.error("Failed to parse WebSocket message:", e, event.data);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setError(error);
      onError?.(error);
    };

    wsRef.current = ws;

    return () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close(1000, "Component unmounting");
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [conversationId, onConnect, onDisconnect, onError]);

  useEffect(() => {
    const cleanup = connect();
    return () => {
      cleanup?.();
    };
  }, [connect]);

  const sendMessage = useCallback(
    (content: string) => {
      if (!wsRef.current || !isConnected) {
        console.error("Cannot send message: WebSocket not connected");
        return;
      }

      const message = {
        type: "message",
        content,
        conversationId,
        senderId: userId,
      };

      try {
        wsRef.current.send(JSON.stringify(message));
      } catch (error) {
        console.error("Failed to send message:", error);
        setError(new Event("Failed to send message"));
      }
    },
    [isConnected, conversationId, userId]
  );

  return {
    isConnected,
    sendMessage,
    messages,
    lastMessage: messages[messages.length - 1] || null,
    error,
  };
}
