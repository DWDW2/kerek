"use client";
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Heart,
  Code2,
  Calendar,
  Play,
  Copy,
  ArrowLeft,
  Terminal,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import Editor from "@monaco-editor/react";
import { Post } from "@/types/post";

interface PostDetailProps {
  id: string;
}

interface PostData {
	author: { user_id: string; username: string };
	post: {
		id: string;
		user_id: string;
		title: string;
		content: string;
		code: string;
		language?: string;
		tags?: string[];
		created_at?: number;
		likes?: number;
		likedByCurrentUser?: boolean;
  };
}

interface CompileResult {
  success: boolean;
  output?: string;
  error?: string;
  execution_time?: number;
}

export async function toggleLikePost(id: string): Promise<Post> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

  if (!token) {
    throw new Error("Authentication token not found");
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/posts/${id}/toggle-like`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to toggle like: ${response.status}`);
  }

  return response.json();
}

export function PostDetail({ id }: PostDetailProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState<number>(0);
  const [code, setCode] = useState<string>("");
  const [input, setInput] = useState("");
  const [result, setResult] = useState<CompileResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [postData, setPostData] = useState<PostData | null>(null);
  const [isLiking, setIsLiking] = useState(false);

  useEffect(() => {
    async function fetchPost() {
      if (!id) {
        setError("Post ID is required");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const token = localStorage.getItem("auth_token");
        if (!token) {
          throw new Error("Authentication token not found");
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/posts/${id}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to fetch post: ${response.status}`);
        }

        const data: PostData = await response.json();
        console.log(data);
        setPostData(data);
        setCode(data.post.code || "");
        setLikesCount(data.post.likes || 0);
        setIsLiked(data.post.likedByCurrentUser || false);
      } catch (err) {
        console.error("Error fetching post:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch post");
      } finally {
        setIsLoading(false);
      }
    }

    fetchPost();
  }, [id]);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading post...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              <span className="font-medium">Error: {error}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!postData) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Card className="border-gray-200">
          <CardContent className="p-6">
            <div className="text-gray-600">Post not found</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleLike = async () => {
    if (isLiking) return;

    try {
      setIsLiking(true);
      await toggleLikePost(postData.post.id);
      
      setIsLiked((prev) => !prev);
      setLikesCount((prev) => (isLiked ? prev - 1 : prev + 1));
    } catch (error) {
      console.error("Failed to toggle like:", error);
    } finally {
      setIsLiking(false);
    }
  };

  const runCode = async () => {
    if (!postData.post.language || !code.trim()) {
      setResult({
        success: false,
        error: "No code to run or language not specified",
      });
      return;
    }

    setIsRunning(true);
    setResult(null);

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const response = await fetch("/api/run-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code,
          language: postData.post.language,
          input: input || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Code execution error:", error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Network error: Unable to connect to the server",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch (error) {
      console.error("Failed to copy code:", error);
      const textArea = document.createElement("textarea");
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
  };

  const copyOutput = async () => {
    const textToCopy = result?.output || result?.error || "";
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
    } catch (error) {
      console.error("Failed to copy output:", error);
      const textArea = document.createElement("textarea");
      textArea.value = textToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
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
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/posts">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Posts
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {postData.post.title}
              </h1>
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {postData.author.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-gray-900">
                      {postData.author.username}
                    </p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {postData.post.created_at ? formatDate(postData.post.created_at) : "Date not available"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {postData.post.language && (
                    <Badge className={getLanguageColor(postData.post.language)}>
                      <Code2 className="h-4 w-4 mr-1" />
                      {postData.post.language}
                    </Badge>
                  )}
                  <Button
                    onClick={handleLike}
                    disabled={isLiking}
                    variant={isLiked ? "default" : "outline"}
                    className={isLiked ? "text-red-600 border-red-200 bg-red-50 hover:bg-red-100" : ""}
                  >
                    {isLiking ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Heart
                        className={`h-4 w-4 mr-1 ${isLiked ? "fill-current text-red-600" : ""}`}
                      />
                    )}
                    {likesCount}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {postData.post.content}
            </p>
          </div>

          {postData.post.tags?.length ? postData.post.tags?.length : 0 > 0 && (
            <div className="flex flex-wrap gap-2 mt-6">
              {postData.post.tags!.map((tag, index) => (
                <Badge
                  key={`${tag}-${index}`}
                  variant="secondary"
                  className="bg-primary text-white"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {postData.post.code && (
        <Card className="border-violet-100">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Code</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyCode}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                {postData.post.language && (
                  <Button
                    onClick={runCode}
                    disabled={isRunning || !code.trim()}
                    className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white disabled:opacity-50"
                  >
                    {isRunning ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Run Code
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="code" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="code">Code Editor</TabsTrigger>
                <TabsTrigger value="input">Input</TabsTrigger>
                <TabsTrigger value="output">Output</TabsTrigger>
              </TabsList>

              <TabsContent value="code" className="mt-4">
                <div className="border rounded-lg overflow-hidden">
                  <Editor
                    height="400px"
                    language={postData.post.language}
                    value={code}
                    onChange={(value) => setCode(value || "")}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      wordWrap: "on",
                      readOnly: false,
                    }}
                  />
                </div>
              </TabsContent>

              <TabsContent value="input" className="mt-4">
                <Textarea
                  placeholder="Enter input for your program (if needed)..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="min-h-[200px] font-mono"
                />
              </TabsContent>

              <TabsContent value="output" className="mt-4">
                <Card className="bg-slate-900 text-slate-100">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Terminal className="h-4 w-4" />
                        <span className="text-sm font-medium">Output</span>
                      </div>
                      {result && (
                        <div className="flex items-center gap-4">
                          {result.execution_time && (
                            <div className="flex items-center gap-1 text-xs text-slate-400">
                              <Clock className="h-3 w-3" />
                              {result.execution_time}ms
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            {result.success ? (
                              <CheckCircle className="h-4 w-4 text-green-400" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-400" />
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={copyOutput}
                              className="text-slate-400 hover:text-slate-100"
                              disabled={!result.output && !result.error}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      {result ? (
                        <pre className="text-sm whitespace-pre-wrap break-words">
                          {result.success ? result.output : result.error}
                        </pre>
                      ) : (
                        <div className="text-slate-400 text-sm">
                          Run the code to see output here...
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
