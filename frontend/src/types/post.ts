export interface Post {
  id: string;
  user_id: string;
  title: string;
  content: string;
  code?: string;
  language?: string;
  tags?: string[];
  created_at: number;
  updated_at: number;
  is_published: boolean;
  likes_count: number;
}

export interface PostAuthor {
  user_id: string;
  username: string;
}

export interface PostResponse {
  post: Post;
  author: PostAuthor;
}

export interface NewPost {
  title: string;
  content: string;
  code?: string;
  language?: string;
  tags?: string[];
  is_published?: boolean;
}

export interface UpdatePost {
  title?: string;
  content?: string;
  code?: string;
  language?: string;
  tags?: string[];
  is_published?: boolean;
}
