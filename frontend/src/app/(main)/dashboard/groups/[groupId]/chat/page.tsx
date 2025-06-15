"use client";
import { useAuth } from "@/context/auth-context";
import React, { use, useEffect, useRef, useState } from "react";
import { ChatLayout, GroupHeader, GroupMessageList } from "@/components/chat";
import MessageInput from "@/components/conversations/message-input";

import { GroupMessage } from "@/types/group-message";

interface Props {
  params: Promise<{ groupId: string }>;
}

export default function page({ params }: Props) {
  const paramsStatic = use(params);
  const { token, user } = useAuth();
  const wsRef = useRef<null | WebSocket>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [wsError, setWsError] = useState<string | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [message, setMessage] = useState<string>("");

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
    if (token && paramsStatic.groupId) {
      fetchMessages();
    }
  }, [token, paramsStatic.groupId]);

  useEffect(() => {
    const connectToWs = () => {
      const wsUrl =
        process.env.NEXT_PUBLIC_WS_URL_RUST || "ws://localhost:8080";
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

  const sendContent = async (content: string) => {
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

      const tempMessage: GroupMessage = {
        id: `temp_${Date.now().toString()}`,
        content: content,
        sender_id: user.id,
        group_id: paramsStatic.groupId,
        created_at: Date.now() / 1000,
        updated_at: Date.now() / 1000,
        is_edited: false,
        is_deleted: false,
      };
      setMessages((prevMessages) => [...prevMessages, tempMessage]);
    } catch (error) {
      console.error("Failed to send message via WebSocket:", error);
      const specificError =
        error instanceof Error ? error.message : "Failed to send message.";
      setWsError(specificError);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <ChatLayout
      header={<GroupHeader groupId={paramsStatic.groupId} />}
      messageInput={
        <MessageInput
          isConnected={isConnected}
          isSending={isSending}
          wsError={wsError}
          newMessage={message}
          setNewMessage={setMessage}
          onSendContent={sendContent}
        />
      }
      wsError={wsError}
    >
      <GroupMessageList messages={messages} scrollRef={scrollRef} />
    </ChatLayout>
  );
}
