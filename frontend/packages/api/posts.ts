import { Post, PostResponse, NewPost, UpdatePost } from "@/types/post";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export async function getAllPosts(limit?: number): Promise<PostResponse[]> {
  const params = new URLSearchParams();
  if (limit) params.append("limit", limit.toString());

  const response = await fetch(`${API_URL}/posts?${params}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch posts");
  }

  return response.json();
}

export async function getPostById(id: string): Promise<PostResponse> {
  const response = await fetch(`${API_URL}/posts/${id}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch post");
  }

  return response.json();
}

export async function getMyPosts(limit?: number): Promise<PostResponse[]> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const params = new URLSearchParams();
  if (limit) params.append("limit", limit.toString());

  const response = await fetch(`${API_URL}/posts/me?${params}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch my posts");
  }

  return response.json();
}

export async function createPost(post: NewPost): Promise<Post> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

  const response = await fetch(`${API_URL}/posts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(post),
  });

  if (!response.ok) {
    throw new Error("Failed to create post");
  }

  return response.json();
}

export async function updatePost(id: string, post: UpdatePost): Promise<Post> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

  const response = await fetch(`${API_URL}/posts/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(post),
  });

  if (!response.ok) {
    throw new Error("Failed to update post");
  }

  return response.json();
}

export async function deletePost(id: string): Promise<void> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

  const response = await fetch(`${API_URL}/posts/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to delete post");
  }
}

export async function toggleLikePost(id: string): Promise<Post> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

  const response = await fetch(`${API_URL}/posts/${id}/toggle-like`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to toggle like");
  }

  return response.json();
}
