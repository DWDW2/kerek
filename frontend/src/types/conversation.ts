export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  name: string | null;
  participant_ids: string[];
  created_at: string;
  updated_at: string;
  last_message?: Message;
}

export interface NewMessage {
  content: string;
}

export interface NewConversation {
  name?: string;
  participant_ids: string[];
}

export interface ListMessagesRequest {
  limit?: number;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}
