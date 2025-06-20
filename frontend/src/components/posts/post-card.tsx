"use client";

import React, { useState } from "react";
import { PostResponse } from "@/types/post";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Heart,
  Code2,
  Calendar,
  User,
  Play,
  Eye,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { toggleLikePost } from "@/packages/api/posts";

interface PostCardProps {
  postResponse: PostResponse;
}

export function PostCard({ postResponse }: PostCardProps) {
  const { post, author } = postResponse;
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleLike = async () => {
    try {
      await toggleLikePost(post.id);
      setIsLiked(!isLiked);
      setLikesCount((prev) => (isLiked ? prev - 1 : prev + 1));
    } catch (error) {
      console.error("Failed to toggle like:", error);
    }
  };

  const getLanguageColor = (language?: string) => {
    const colors: Record<string, string> = {
      python: "bg-blue-100 text-blue-800 border-blue-200",
      javascript: "bg-yellow-100 text-yellow-800 border-yellow-200",
      typescript: "bg-blue-100 text-blue-800 border-blue-200",
      java: "bg-orange-100 text-orange-800 border-orange-200",
      cpp: "bg-purple-100 text-purple-800 border-purple-200",
      c: "bg-gray-100 text-gray-800 border-gray-200",
      rust: "bg-orange-100 text-orange-800 border-orange-200",
      go: "bg-cyan-100 text-cyan-800 border-cyan-200",
    };
    return (
      colors[language?.toLowerCase() || ""] ||
      "bg-gray-100 text-gray-800 border-gray-200"
    );
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-violet-100 hover:border-violet-300 hover:-translate-y-1">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-sm">
                {author.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {author.username}
              </p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {formatDate(post.created_at)}
              </div>
            </div>
          </div>
          {post.language && (
            <Badge className={`text-xs ${getLanguageColor(post.language)}`}>
              <Code2 className="h-3 w-3 mr-1" />
              {post.language}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-2 group-hover:text-violet-700 transition-colors">
            {post.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-3">
            {post.content}
          </p>
        </div>

        {/* Code Preview */}
        {post.code && (
          <div className="bg-slate-900 rounded-lg p-3 relative overflow-hidden">
            <pre className="text-xs text-slate-300 overflow-hidden">
              <code className="line-clamp-4">{post.code}</code>
            </pre>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent pointer-events-none" />
          </div>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-xs bg-violet-50 text-violet-700 hover:bg-violet-100"
              >
                {tag}
              </Badge>
            ))}
            {post.tags.length > 3 && (
              <Badge
                variant="secondary"
                className="text-xs text-muted-foreground"
              >
                +{post.tags.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-4">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1 text-sm transition-colors ${
                isLiked
                  ? "text-red-600 hover:text-red-700"
                  : "text-muted-foreground hover:text-red-600"
              }`}
            >
              <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
              {likesCount}
            </button>
            {post.code && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Play className="h-4 w-4" />
                Runnable
              </div>
            )}
          </div>

          <Link href={`/dashboard/posts/${post.id}`}>
            <Button
              size="sm"
              variant="ghost"
              className="text-violet-600 hover:text-violet-700 hover:bg-violet-50"
            >
              <Eye className="h-4 w-4 mr-1" />
              View
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
