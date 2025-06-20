import React from "react";
import { PostsList } from "@/components/posts/posts-list";
import { getAllPosts } from "@/packages/api/posts";

export default async function PostsPage() {
  const posts = await getAllPosts(50);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
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
