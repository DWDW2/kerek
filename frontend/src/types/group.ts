export interface GroupCustomization {
  background_image_url?: string;
  primary_message_color?: string;
  secondary_message_color?: string;
  text_color_primary?: string;
  text_color_secondary?: string;
  photo_url?: string;
}

export interface Group {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
  member_ids: string[];
  customization?: GroupCustomization;
}

export interface NewGroup {
  name: string;
  member_ids: string[];
}

export interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  created_at: number;
  updated_at: number;
  is_edited: boolean;
  is_deleted: boolean;
}

export interface NewGroupMessage {
  content: string;
}

export interface AddMemberRequest {
  user_id: string;
}

export interface RemoveMemberRequest {
  user_id: string;
}

export interface UpdateGroupRequest {
  name?: string;
}

export interface ListMessagesQuery {
  limit?: number;
}
