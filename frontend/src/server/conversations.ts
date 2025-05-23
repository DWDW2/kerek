import {
  Conversation,
  Message,
  NewConversation,
  NewMessage,
  ListMessagesRequest,
  ConversationCustomization,
} from "@/types/conversation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export async function listConversations(
  token: string
): Promise<Conversation[]> {
  const response = await fetch(`${API_BASE}/conversations`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error("Failed to fetch conversations");
  return response.json();
}

export async function createConversation(
  data: NewConversation,
  token: string
): Promise<Conversation> {
  const response = await fetch(`${API_BASE}/conversations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create conversation");
  return response.json();
}

export async function getConversation(
  id: string,
  token: string
): Promise<Conversation> {
  const response = await fetch(`${API_BASE}/conversations/${id}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error("Failed to fetch conversation");
  return response.json();
}

export async function updateConversation(
  id: string,
  name: string | null,
  token: string
): Promise<Conversation> {
  const response = await fetch(`${API_BASE}/conversations/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) throw new Error("Failed to update conversation");
  return response.json();
}

export async function listMessages(
  conversationId: string,
  limit?: number,
  token?: string
): Promise<Message[]> {
  const response = await fetch(
    `${API_BASE}/conversations/${conversationId}/messages?${new URLSearchParams(
      {
        limit: limit?.toString() ?? "50",
      }
    )}`,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (!response.ok) throw new Error("Failed to fetch messages");
  return response.json();
}

export async function sendMessage(
  conversationId: string,
  data: NewMessage,
  token?: string
): Promise<Message> {
  const response = await fetch(
    `${API_BASE}/conversations/${conversationId}/messages`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) throw new Error("Failed to send message");
  return response.json();
}

export async function updateConversationCustomization(
  id: string,
  customization: ConversationCustomization,
  file: File,
  token: string
): Promise<Conversation> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("customization", JSON.stringify(customization));

  const response = await fetch(
    `${API_BASE}/conversations/${id}/customization`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    }
  );
  if (!response.ok)
    throw new Error("Failed to update conversation customization");
  return response.json();
}
