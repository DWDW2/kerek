import React from "react";
import { PostDetail } from "@/components/posts/post-detail";

interface PostPageProps {
  params: {
    id: string;
  };
}

export default async function PostPage({params}: PostPageProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <PostDetail id={params.id} />
    </div>
  );
}
