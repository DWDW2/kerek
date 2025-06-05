export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationCustomization {
  background_image_url?: string;
  primary_message_color?: string;
  secondary_message_color?: string;
  text_color_primary?: string;
  text_color_secondary?: string;
}

export interface Conversation {
  id: string;
  name: string | null;
  participant_ids: string[];
  created_at: string;
  updated_at: string;
  last_message?: Message;
  customization?: ConversationCustomization;
  message_count: number;
}

export interface NewMessage {
  content: string;
  sender_id: string;
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

export type LatestMessages = {
  id: string;
  message: Message;
  name: string;
  other_user: string;
};
