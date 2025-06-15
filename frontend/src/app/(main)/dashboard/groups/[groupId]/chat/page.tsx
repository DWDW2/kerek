"use client";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { SendHorizontal } from "lucide-react";
import React, { use, useEffect, useRef, useState } from "react";

interface Message {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  created_at: number;
  updated_at: number;
  is_edited: boolean;
  is_deleted: boolean;
}

interface Props {
  params: Promise<{ groupId: string }>;
}

export default function page({ params }: Props) {
  const paramsStatic = use(params);
  const { token, user } = useAuth();
  const wsRef = useRef<null | WebSocket>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [wsError, setWsError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    if (!token || !paramsStatic.groupId) return;

    try {
      const response = await fetch(
        `/api/groups/${paramsStatic.groupId}/messages?limit=50`,
        {
          headers: {
            authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const existingMessages = await response.json();
        setMessages(existingMessages.reverse());
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  };



  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (token && paramsStatic.groupId) {
      fetchMessages();
    }
  }, [token, paramsStatic.groupId]);

  useEffect(() => {
    const connectToWs = () => {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL_RUST || "ws://localhost:8080";
      const ws = new WebSocket(
        `${wsUrl}/ws/groups/${paramsStatic.groupId}?token=${token}`
      );
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setWsError(null);
        console.log("WebSocket connected");
      };

      ws.onmessage = (event) => {
        try {
          const newMessage = JSON.parse(event.data);
          setMessages((prevMessages) => [...prevMessages, newMessage]);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        console.log("disconnecting from the websocket server");
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setWsError("Connection error occurred");
      };
    };

    if (token) {
      connectToWs();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [paramsStatic.groupId, token]);

  const sendContent = (content: string) => {
    if (!content.trim()) {
      console.warn("Attempted to send empty content.");
      return;
    }
    if (!isConnected) {
      setWsError("Not connected. Please wait for connection to establish.");
      return;
    }
    if (!user?.id) {
      setWsError("User context is missing. Cannot send message.");
      console.error("sendContent: User ID is missing.", `User ID: ${user?.id}`);
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
        groupId: paramsStatic.groupId,
        senderId: user.id,
      };

      wsRef.current.send(JSON.stringify(messagePayload));

      setMessage("");
    } catch (error) {
      console.error("Failed to send message via WebSocket:", error);
      const specificError =
        error instanceof Error ? error.message : "Failed to send message.";
      setWsError(specificError);
    } finally {
      setIsSending(false);
    }
  };

	const handleSendMessage = (e: React.FormEvent) => {
		e.preventDefault();
		if (message.trim()) {
			const messagePayload = {
				id: "",
				created_at: new Date().getTime(),
				updated_at: new Date().getTime(),
				content: message,
				groupId: paramsStatic.groupId,
				senderId: user?.id,
				is_edited: false,
				is_deleted: false,
			}
			setMessages([messages, ...messagePayload]);
			sendContent(message);
		}
	};

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-3 rounded-lg max-w-xs ${
              msg.sender_id === user?.id
                ? "bg-blue-500 text-white ml-auto"
                : "bg-gray-200 text-gray-900"
            }`}
          >
            <p className="text-sm">{msg.content}</p>
            <p className="text-xs opacity-70 mt-1">
              {new Date(msg.created_at * 1000).toLocaleTimeString()}
            </p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {wsError && (
        <div className="p-2 bg-red-100 border-l-4 border-red-500 text-red-700 text-sm">
          {wsError}
        </div>
      )}

      <form
        onSubmit={handleSendMessage}
        className="flex items-center p-4 border-t"
      >
        <div className="flex-1 relative flex items-center space-x-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              isConnected
                ? "Type a message..."
                : wsError
                ? "Connection error. Please try again."
                : "Connecting..."
            }
            disabled={!isConnected || isSending}
            className="flex-1 py-6 text-base rounded-full px-5 shadow-sm border-muted-foreground/20 pr-24"
          />
        </div>
        <Button
          type="submit"
          size="icon"
          disabled={!isConnected || !message.trim() || isSending}
          className="shrink-0 rounded-full h-12 w-12 shadow-md"
        >
          <SendHorizontal className="h-5 w-5" />
        </Button>
      </form>
    </div>
  );
}
