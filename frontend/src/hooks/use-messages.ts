import { useState, useEffect, useCallback } from "react";
import { Message } from "@/types/conversation";

export function useMessages(id: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const mergeMessages = useCallback((newMsg: Message[]) => {
    setMessages((prev) => [...prev, ...newMsg]);
  }, []);

  useEffect(() => {
    const loadMessages = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/conversations/${id}/messages?limit=20`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
            },
          }
        );
        if (!response.ok) throw new Error("Failed to load messages");
        const data = await response.json();
        setMessages(data.reverse());
        setHasMore(data.length === 20);
      } catch (error) {
        console.error("Failed to load messages:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      loadMessages();
    }
  }, [id]);

  const loadOlderMessages = async () => {
    if (isLoadingMore || !messages.length) return;
    setIsLoadingMore(true);
    try {
      const oldest = messages[0];
      const response = await fetch(
        `/api/conversations/${id}/messages?limit=20&before=${encodeURIComponent(
          oldest.created_at
        )}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to load older messages");
      const data = await response.json();
      if (data.length === 0) setHasMore(false);
      mergeMessages(data.reverse());
    } catch (error) {
      console.error("Failed to load older messages:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return {
    messages,
    isLoading,
    hasMore,
    isLoadingMore,
    loadOlderMessages,
    setMessages,
    mergeMessages,
  };
}
