"use client";
import React, { useEffect, useState } from "react";
import { PostResponse } from "@/types/post";
import { PostCard } from "./post-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Plus } from "lucide-react";
import Link from "next/link";

export function PostsList() {
  const [posts, setPosts] = useState<PostResponse[]>();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);


	useEffect(() => {
		const fetchPosts = async () => {
				const posts = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/posts`, {
						method: "GET", 
						headers: {
							"ContentType": "application/json",
							"Authorization": `Bearer ${window.localStorage.getItem("auth_token")}`
						}
				});
				console.log(posts) 
				const data = await posts.json();
				return data; 
		}

		fetchPosts().then(data => setPosts(data)).catch(err => console.log(err)); 
	}, [])
  

	const filteredPosts = posts!.filter((postResponse) => {
    const matchesSearch =
      postResponse.post.title
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      postResponse.post.content
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesLanguage =
      !selectedLanguage || postResponse.post.language === selectedLanguage;

    return matchesSearch && matchesLanguage;
  });


  const allLanguages = Array.from(
    new Set(posts!.map((p) => p.post.language).filter(Boolean))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search posts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-violet-200 focus:border-violet-400 focus:ring-violet-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="flex gap-2">
              <Badge
                variant={selectedLanguage === null ? "default" : "outline"}
                onClick={() => setSelectedLanguage(null)}
              >
                All
              </Badge>
              {allLanguages.map((language) => (
                <Badge
                  key={language}
                  variant={
                    selectedLanguage === language ? "default" : "outline"
                  }
                  onClick={() => setSelectedLanguage(language!)}
                >
                  {language}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <Link href="/dashboard/posts/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Post
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPosts.map((postResponse) => (
          <PostCard key={postResponse.post.id} postResponse={postResponse} />
        ))}
      </div>

      {filteredPosts.length === 0 && (
        <div className="text-center py-12">
          <div className="text-muted-foreground text-lg">
            No posts found matching your criteria
          </div>
          <Link href="/dashboard/posts/create">
            <Button className="mt-4 text-white">
              Create the first post
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
