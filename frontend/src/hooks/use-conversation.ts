import { useState, useEffect, useCallback } from "react";
import { Conversation } from "@/types/conversation";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface CreateConversationPayload {
  participant_ids: string[];
  is_group: boolean;
  name: string;
}

export function useConversation(conversationId?: string) {
  const router = useRouter();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConversation = useCallback(async () => {
    if (!conversationId) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(`/api/conversations/${conversationId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load conversation: ${response.status}`);
      }

      const data = await response.json();
      setConversation(data);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load conversation";
      console.error("Failed to load conversation details:", error);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  const refetch = useCallback(() => {
    if (conversationId) {
      setIsLoading(true);
      loadConversation();
    }
  }, [conversationId, loadConversation]);

  const createConversation = useCallback(
    async (payload: CreateConversationPayload) => {
      try {
        setIsCreating(true);
        setError(null);

        const token = localStorage.getItem("auth_token");
        if (!token) {
          throw new Error("No authentication token found");
        }

        const response = await fetch("/api/conversations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            participant_ids: payload.participant_ids,
            is_group: payload.is_group,
            name: payload.name,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to create conversation: ${response.status}`);
        }

        const conversation = await response.json();

        router.push(`/dashboard/conversations/${conversation.id}`);
        toast.success("Conversation created successfully");
        return conversation;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to create conversation";
        console.error("Error creating conversation:", error);
        setError(errorMessage);
        toast.error(errorMessage);
        throw error;
      } finally {
        setIsCreating(false);
      }
    },
    [router]
  );

  const fetchConversations = useCallback(async () => {
    try {
      setIsFetching(true);
      setError(null);

      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch("/api/conversations", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch conversations: ${response.status}`);
      }

      const data = await response.json();
      setConversations(data);
      return data;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to fetch conversations";
      console.error("Error fetching conversations:", error);
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsFetching(false);
    }
  }, []);

  const latesestMessagesByConversation = useCallback(async () => {
    try {
      setIsFetching(true);
      setError(null);

      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch("/api/conversations/latest-messages", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch latest messages by conversation: ${response.status}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to fetch latest messages by conversation";
      console.error("Error fetching latest messages by conversation:", error);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    if (conversationId) {
      loadConversation();
    } else {
      setIsLoading(false);
      setConversation(null);
    }
  }, [conversationId, loadConversation]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return {
    conversation,
    conversations,
    error,
    isLoading,
    isCreating,
    isFetching,
    refetch,
    createConversation,
  };
}
