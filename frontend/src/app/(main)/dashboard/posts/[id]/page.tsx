import React from "react";
import { PostDetail } from "@/components/posts/post-detail";
import { getPostById } from "@/packages/api/posts";

interface PostPageProps {
  params: {
    id: string;
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const post = await getPostById(params.id);

  return (
    <div className="container mx-auto px-4 py-8">
      <PostDetail post={post} />
    </div>
  );
}
