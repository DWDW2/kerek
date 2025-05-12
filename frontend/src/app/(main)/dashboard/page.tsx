"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecentSearches } from "@/components/recent-searches";
import { RecommendedContent } from "@/components/recommend-content";

interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  interests: string[];
}

const mockUser: User = {
  id: "1",
  name: "Jane Smith",
  email: "jane.smith@example.com",
  image: "/avatars/jane-smith.png",
  interests: ["Technology", "Health", "Finance", "Education", "Environment"],
};

export default function Dashboard() {
  const user = mockUser;

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="content">Recommended Content</TabsTrigger>
            <TabsTrigger value="searches">Recent Searches</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    User Profile
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={user.image} alt={user.name} />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xl font-bold">{user.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Your Interests</CardTitle>
                  <CardDescription>
                    Topics you're interested in learning about
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {user.interests.map((interest) => (
                      <Badge key={interest} variant="secondary">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Content Summary</CardTitle>
                  <CardDescription>
                    Overview of your personalized content
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Saved articles</span>
                      <span className="font-medium">12</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Recommended today</span>
                      <span className="font-medium">5</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">New in your interests</span>
                      <span className="font-medium">8</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-1">
              <Card>
                <CardHeader>
                  <CardTitle>Trending in Your Interests</CardTitle>
                  <CardDescription>
                    Popular content related to your interests
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* This would be populated with actual trending content */}
                    <div className="border-b pb-4">
                      <h3 className="font-medium">
                        The Future of AI in Healthcare
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        New research shows promising applications of AI in early
                        disease detection.
                      </p>
                    </div>
                    <div className="border-b pb-4">
                      <h3 className="font-medium">
                        Sustainable Finance: A Guide for Beginners
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        How to align your investments with environmental and
                        social goals.
                      </p>
                    </div>
                    <div>
                      <h3 className="font-medium">
                        Education Technology Trends in 2025
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        The latest innovations transforming classrooms around
                        the world.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            <RecommendedContent />
          </TabsContent>

          <TabsContent value="searches" className="space-y-4">
            <RecentSearches />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
