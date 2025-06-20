import React from "react";
import { CreatePostForm } from "@/components/posts/create-post-form";

export default function CreatePostPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
            Share Your Code
          </h1>
          <p className="text-muted-foreground mt-2">
            Create a new post to share your code with the community
          </p>
        </div>
        <CreatePostForm />
      </div>
    </div>
  );
}
