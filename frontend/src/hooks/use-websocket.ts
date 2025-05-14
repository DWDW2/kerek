import { useEffect, useRef, useState, useCallback } from "react";

interface WebSocketMessage {
  type: "message" | "system";
  content: string;
  room?: string;
  senderId?: string;
  timestamp: string;
}

interface UseWebSocketProps {
  url: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  sendMessage: (content: string, room: string) => void;
  joinRoom: (room: string) => void;
  leaveRoom: (room: string) => void;
  messages: WebSocketMessage[];
  lastMessage: WebSocketMessage | null;
  error: Event | null;
}

export function useWebSocket({
  url,
  onConnect,
  onDisconnect,
  onError,
}: UseWebSocketProps): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [error, setError] = useState<Event | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const clientIdRef = useRef<number | null>(null);

  const connect = useCallback(() => {
    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
      onConnect?.();

      // Send connect message to get client ID
      ws.send(JSON.stringify({ type: "connect" }));
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
      onDisconnect?.();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Handle initial connection response with client ID
        if (data.type === "connect" && data.id) {
          clientIdRef.current = data.id;
          return;
        }

        const message: WebSocketMessage = {
          type: data.type || "message",
          content: data.content || data.msg,
          room: data.room,
          senderId: data.senderId,
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
    };
  }, [url, onConnect, onDisconnect, onError]);

  useEffect(() => {
    const cleanup = connect();
    return () => {
      cleanup?.();
    };
  }, [connect]);

  const sendMessage = useCallback(
    (content: string, room: string) => {
      if (!wsRef.current || !isConnected || !clientIdRef.current) return;

      const message = {
        type: "message",
        id: clientIdRef.current,
        msg: content,
        room,
      };

      wsRef.current.send(JSON.stringify(message));
    },
    [isConnected]
  );

  const joinRoom = useCallback(
    (room: string) => {
      if (!wsRef.current || !isConnected || !clientIdRef.current) return;

      const message = {
        type: "join",
        id: clientIdRef.current,
        name: room,
      };

      wsRef.current.send(JSON.stringify(message));
    },
    [isConnected]
  );

  const leaveRoom = useCallback(
    (room: string) => {
      if (!wsRef.current || !isConnected || !clientIdRef.current) return;

      const message = {
        type: "leave",
        id: clientIdRef.current,
        room,
      };

      wsRef.current.send(JSON.stringify(message));
    },
    [isConnected]
  );

  return {
    isConnected,
    sendMessage,
    joinRoom,
    leaveRoom,
    messages,
    lastMessage: messages[messages.length - 1] || null,
    error,
  };
}
