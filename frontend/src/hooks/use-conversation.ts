import { useState, useEffect } from "react";
import { Conversation } from "@/types/conversation";

export function useConversation(id: string) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  console.log(conversation);
  useEffect(() => {
    const loadConversation = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/conversations/${id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
            },
          }
        );
        if (!response.ok) throw new Error("Failed to load conversation");
        const data = await response.json();
        setConversation(data);
      } catch (error) {
        console.error("Failed to load conversation details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      loadConversation();
    }
  }, [id]);

  return { conversation, isLoading };
}
