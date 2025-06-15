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
