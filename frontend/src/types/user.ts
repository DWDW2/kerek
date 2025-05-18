export interface User {
  id: string;
  username: string;
  email: string;
  created_at: number;
  updated_at: number;
  last_seen_at: number | null;
  is_online: boolean;
}
