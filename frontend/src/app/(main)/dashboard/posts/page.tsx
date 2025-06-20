'use client'
import React from "react";
import { PostsList } from "@/components/posts/posts-list";
import { PostResponse } from "@/types/post";

const API_URL = process.env.NEXT_PUBLIC_API_URL

async function getAllPosts(limit?: number ): Promise<PostResponse[]> {
  const params = new URLSearchParams();
  if (limit) params.append("limit", limit.toString());

  const response = await fetch(`${API_URL}/posts?${params}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
			"Authorization": `Bearer ${window.localStorage.getItem("auth_token")}`
    },
  });
	console.log(response) 
  if (!response.ok) {
    throw new Error("hui");
  }

  return response.json();
}

export default function PostsPage() {
	const [posts, setPosts] = React.useState<PostResponse[]>([]); 
	React.useEffect(() => {	
		getAllPosts()
		.then(data => setPosts(data))
		.catch(err => console.log(err))
	}, []) 
	console.log(posts) 
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold">
            Code Posts
          </h1>
          <p className="text-muted-foreground mt-2">
            Discover and share code snippets with the community
          </p>
        </div>
      </div>
      <PostsList initialPosts={posts} />
    </div>
  );
}
