"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { useMessages } from "@/hooks/use-messages";
import { Message } from "@/types/conversation";
import { useConversation } from "@/hooks/use-conversation";
import ConversationHeader from "./conversation-header";
import MessageList from "./message-list";
import MessageInput from "./message-input";
import { ConversationCustomization } from "./conversation-customization";
import { GameLauncher } from "@/components/game/game-launcher";
import { useUser } from "@/hooks/use-user";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

export function ConversationDetail() {
  const { id: conversationId } = useParams();
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [wsError, setWsError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const {
    messages,
    isLoading: isLoadingMessages,
    hasMore,
    isLoadingMore,
    loadOlderMessages,
    setMessages,
    mergeMessages,
  } = useMessages(conversationId as string);

  const {
    conversation,
    isLoading: isLoadingConversation,
    refetch: refetchConversation,
  } = useConversation(conversationId as string);
  const { user } = useAuth();
  const { user: reciever, isLoading: isLoadingReciever } = useUser(
    conversation?.participant_ids.find((id) => id !== user?.id) || ""
  );

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
          const message = JSON.parse(event.data) as Message;
          mergeMessages([message]);
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
  }, [conversationId, user?.id, mergeMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const sendContent = async (content: string) => {
    if (!content.trim()) {
      console.warn("Attempted to send empty content.");
      return;
    }
    if (!isConnected) {
      setWsError("Not connected. Please wait for connection to establish.");
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

      const tempMessage: Message = {
        id: `temp_${Date.now().toString()}`,
        content: content,
        sender_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        conversation_id: conversationId as string,
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

  const isLoading =
    isLoadingConversation || isLoadingMessages || isLoadingReciever;

  if (isLoading) {
    return (
      <Card className="flex-1">
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-[200px]" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start space-x-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-4 w-[300px]" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!conversation) {
    return <div>Conversation not found</div>;
  }

  return (
    <Card className="h-full flex flex-col border-none shadow-none rounded-none p-0 m-0">
      <CardHeader className="border-b px-6 py-6 bg-gradient-to-r from-primary/10 to-secondary/10 flex items-center gap-2">
        <Link href="/dashboard">
          <ArrowLeftIcon />
        </Link>
        <ConversationHeader reciever={reciever!} />
        <div className="ml-auto flex flex-row gap-2">
          <ConversationCustomization
            conversationId={conversationId as string}
            currentCustomization={conversation.customization}
          />
          <GameLauncher conversationId={conversationId as string} />
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <MessageList
          messages={messages}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          loadOlderMessages={loadOlderMessages}
          scrollRef={scrollRef as React.RefObject<HTMLDivElement>}
          customization={conversation.customization}
        />
        <div className="border-t p-5 bg-gradient-to-r from-background to-muted/30">
          <MessageInput
            isConnected={isConnected}
            isSending={isSending}
            wsError={wsError}
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            onSendContent={sendContent}
          />
          {wsError && (
            <p className="text-sm text-red-500 mt-2 text-center">{wsError}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
