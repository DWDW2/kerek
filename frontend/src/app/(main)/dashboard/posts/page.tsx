'use client'
import React from "react";
import { PostsList } from "@/components/posts/posts-list";

export default function PostsPage() {

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
      <PostsList />
    </div>
  );
}
