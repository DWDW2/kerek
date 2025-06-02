"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  MessageSquare,
  Clock,
  TrendingUp,
  Edit,
  User as UserIcon,
  Globe,
  Code,
  Heart,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { ProfileEditForm } from "@/components/profile/profile-edit-form";
import { User } from "@/types/user";

interface ProfileData {
  totalConversations: number;
  totalMessages: number;
  daysActive: number;
  avgMessagesPerDay: number;
  conversationsByMonth: Record<string, number>;
}

interface ProfileClientProps {
  getProfileData: (token: string) => Promise<ProfileData>;
}

export function ProfileClient({ getProfileData }: ProfileClientProps) {
  const { user, token, isLoading, updateUser } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!user || !token) {
        router.push("/auth/signin");
        return;
      }

      getProfileData(token)
        .then(setData)
        .catch(console.error)
        .finally(() => setIsLoadingData(false));
    }
  }, [user, token, isLoading, getProfileData, router]);

  const handleProfileUpdated = async (updatedUserData: Partial<User>) => {
    await updateUser(updatedUserData);
    setIsEditMode(false);
  };

  if (isLoading || isLoadingData || !data || !user) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center gap-6">
            <div className="h-24 w-24 bg-muted rounded-full" />
            <div className="space-y-2">
              <div className="h-8 w-48 bg-muted rounded" />
              <div className="h-4 w-32 bg-muted rounded" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded" />
            ))}
          </div>
          <div className="h-96 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (isEditMode) {
    return (
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Edit Profile</h1>
          <Button variant="outline" onClick={() => setIsEditMode(false)}>
            Cancel
          </Button>
        </div>
        <ProfileEditForm user={user} onProfileUpdated={handleProfileUpdated} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Avatar className="h-24 w-24 border-4 border-border">
            <AvatarImage
              src={user.profile_image_url}
              alt={user.username || "User"}
            />
            <AvatarFallback className="text-2xl">
              {user.username?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold">{user.username}</h1>
            <p className="text-muted-foreground">{user.email}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              {user.home_country && (
                <span className="flex items-center gap-1">
                  <Globe className="h-4 w-4" />
                  {user.home_country}
                </span>
              )}
              {user.language && (
                <span className="flex items-center gap-1">
                  <UserIcon className="h-4 w-4" />
                  {user.language.toUpperCase()}
                </span>
              )}
            </div>
          </div>
        </div>
        <Button onClick={() => setIsEditMode(true)} className="gap-2">
          <Edit className="h-4 w-4" />
          Edit Profile
        </Button>
      </div>

      {(user.project_building || user.interests) && (
        <div className="grid gap-4 md:grid-cols-2">
          {user.project_building && (
            <Card>
              <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
                <Code className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Currently Building</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{user.project_building}</p>
              </CardContent>
            </Card>
          )}

          {user.interests && (
            <Card>
              <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
                <Heart className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Interests</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{user.interests}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Conversations
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalConversations}</div>
            <p className="text-xs text-muted-foreground">
              All time conversations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Messages
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalMessages}</div>
            <p className="text-xs text-muted-foreground">Messages exchanged</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Days Active</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.daysActive}</div>
            <p className="text-xs text-muted-foreground">Total active days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average/Day</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.avgMessagesPerDay.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">Messages per day</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(data.conversationsByMonth).map(([month, count]) => (
              <div key={month} className="flex items-center justify-between">
                <span className="text-sm font-medium">{month}</span>
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 bg-primary rounded-full"
                    style={{
                      width: `${Math.max(
                        (count /
                          Math.max(
                            ...Object.values(data.conversationsByMonth)
                          )) *
                          200,
                        10
                      )}px`,
                    }}
                  />
                  <span className="text-sm text-muted-foreground">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
