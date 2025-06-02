export interface User {
  id: string;
  username: string;
  email: string;
  created_at: number;
  updated_at: number;
  last_seen_at: number | null;
  is_online: boolean;
  interests?: string;
  language?: string;
  profile_image_url?: string;
  home_country?: string;
  project_building?: string;
}
