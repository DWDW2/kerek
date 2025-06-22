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
import { toggleLikePost } from "@/packages/api/posts";

interface PostDetailProps {
  id: string;
}

interface PostData {
  id: string;
  title: string;
  content: string;
  created_at: number;
  language: string;
  code: string;
  tags: string[];
  likes: number;
  likedByCurrentUser: boolean;
  author: {
    username: string;
  };
}

interface CompileResult {
  success: boolean;
  output?: string;
  error?: string;
  execution_time?: number;
}

export function PostDetail({ id }: PostDetailProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState<number>(0);
  const [code, setCode] = useState<string>("");
  const [input, setInput] = useState("");
  const [result, setResult] = useState<CompileResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [postData, setPostData] = useState<PostData | null>(null);

  useEffect(() => {
    async function fetchPosts() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/posts/${id}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch posts: ${response.status}`);
        }

        const data = await response.json();
        setPostData(data);
        setCode(data.code || "");
        setLikesCount(data.likes || 0);
        setIsLiked(data.likedByCurrentUser || false);
      } catch (err) {
        console.error("Error fetching posts:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch posts");
      } finally {
        setIsLoading(false);
      }
    }

    fetchPosts();
  }, [id]);

  if (isLoading || !postData) {
    return <div>Loading...</div>;
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
    try {
      await toggleLikePost(postData.id);
      setIsLiked((prev) => !prev);
      setLikesCount((prev) => (isLiked ? prev - 1 : prev + 1));
    } catch (error) {
      console.error("Failed to toggle like:", error);
    }
  };

  const runCode = async () => {
    setIsRunning(true);
    setResult(null);

    try {
      const response = await fetch("/api/run-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${window.localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify({
          code,
          language: postData.language,
          input: input || undefined,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: "Network error: Unable to connect to the server",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const copyCode = () => navigator.clipboard.writeText(code);
  const copyOutput = () => {
    const textToCopy = result?.output || result?.error || "";
    navigator.clipboard.writeText(textToCopy);
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
    <div className="max-w-6xl mx-auto space-y-6">
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
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {postData.title}
              </h1>
              <div className="flex items-center gap-6">
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
                      {formatDate(postData.created_at)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {postData.language && (
                    <Badge className={getLanguageColor(postData.language)}>
                      <Code2 className="h-4 w-4 mr-1" />
                      {postData.language}
                    </Badge>
                  )}
                  <Button
                    onClick={handleLike}
                  >
                    <Heart
                      className={`h-5 w-5 ${isLiked ? "fill-current" : ""}`}
                    />
                    {likesCount}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none">
            <p className="text-gray-700 leading-relaxed">{postData.content}</p>
          </div>

          {postData.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6">
              {postData.tags.map((tag) => (
                <Badge
                  key={tag}
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

      {postData.code && (
        <Card className="border-violet-100">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Code</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyCode}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                {postData.language && (
                  <Button
                    onClick={runCode}
                    disabled={isRunning}
                    className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
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
                    language={postData.language}
                    value={code}
                    onChange={(value) => setCode(value || "")}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
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
                        <pre className="text-sm whitespace-pre-wrap">
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
