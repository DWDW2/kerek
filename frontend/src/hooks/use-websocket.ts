import { useEffect, useRef, useState, useCallback } from "react";

interface WebSocketMessage {
  type: "message" | "system" | "command";
  content: string;
  room?: string;
  sender?: string;
  timestamp: string;
}

interface UseWebSocketProps {
  room: string;
  username?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  sendMessage: (content: string) => void;
  joinRoom: (room: string) => void;
  setUsername: (name: string) => void;
  messages: WebSocketMessage[];
  lastMessage: WebSocketMessage | null;
  error: Event | null;
}

export function useWebSocket({
  room,
  username,
  onConnect,
  onDisconnect,
  onError,
}: UseWebSocketProps): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [error, setError] = useState<Event | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>(null);

  const connect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new WebSocket(
      `ws://localhost:8080/api/conversations/ws/${room}`
    );

    ws.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
      setError(null);
      onConnect?.();
      if (username) {
        ws.send(`/name ${username}`);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
      onDisconnect?.();

      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    ws.onmessage = (event) => {
      try {
        const content = event.data;
        const message: WebSocketMessage = {
          type: content.startsWith("/") ? "command" : "message",
          content,
          room,
          sender: username,
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, message]);
      } catch (e) {
        console.error("Failed to parse WebSocket message:", e);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setError(error);
      onError?.(error);
    };

    wsRef.current = ws;

    return () => {
      ws.close();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [room, username, onConnect, onDisconnect, onError]);

  useEffect(() => {
    const cleanup = connect();
    return () => {
      cleanup?.();
    };
  }, [connect]);

  const sendMessage = useCallback(
    (content: string) => {
      if (!wsRef.current || !isConnected) return;
      wsRef.current.send(content);
    },
    [isConnected]
  );

  const joinRoom = useCallback(
    (newRoom: string) => {
      if (!wsRef.current || !isConnected) return;
      wsRef.current.send(`/join ${newRoom}`);
    },
    [isConnected]
  );

  const setUsername = useCallback(
    (name: string) => {
      if (!wsRef.current || !isConnected) return;
      wsRef.current.send(`/name ${name}`);
    },
    [isConnected]
  );

  return {
    isConnected,
    sendMessage,
    joinRoom,
    setUsername,
    messages,
    lastMessage: messages[messages.length - 1] || null,
    error,
  };
}
