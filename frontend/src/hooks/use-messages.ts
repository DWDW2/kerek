import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  conversation_id: string;
  created_at: string;
}

interface UseMessagesOptions {
  conversationId: string;
  limit?: number;
  enabled?: boolean;
}

export function useMessages({
  conversationId,
  limit = 50,
  enabled = true,
}: UseMessagesOptions) {
  const [messages, setMessages] = useState<Message[]>([]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["messages", conversationId, limit],
    queryFn: async () => {
      const response = await fetch(
        `/api/conversations/${conversationId}/messages?limit=${limit}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }

      const data = await response.json();
      return data as Message[];
    },
    enabled,
  });

  useEffect(() => {
    if (data) {
      setMessages(data);
    }
  }, [data]);

  return {
    messages,
    isLoading,
    error,
    refetch,
  };
}
