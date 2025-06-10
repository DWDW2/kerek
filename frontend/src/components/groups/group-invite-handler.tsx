"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, X } from "lucide-react";
import { toast } from "sonner";

interface Group {
  id: string;
  name: string;
  member_ids: string[];
  customization?: {
    photo_url?: string;
  };
}

interface GroupInviteHandlerProps {
  groupId: string;
}

export function GroupInviteHandler({ groupId }: GroupInviteHandlerProps) {
  const [group, setGroup] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadGroupInfo();
  }, [groupId]);

  const loadGroupInfo = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("Please log in to join groups");
      }

      const response = await fetch(`/api/groups/${groupId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 403) {
        // User is not a member, but we can still show group info for joining
        const publicResponse = await fetch(`/api/groups/${groupId}/public`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (publicResponse.ok) {
          const groupData = await publicResponse.json();
          setGroup(groupData);
        } else {
          throw new Error("Group not found or invite link is invalid");
        }
      } else if (response.ok) {
        const groupData = await response.json();
        setGroup(groupData);
        setAlreadyMember(true);
      } else {
        throw new Error("Failed to load group information");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load group";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!group) return;

    try {
      setIsJoining(true);
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error("Please log in to join groups");
      }

      const response = await fetch(`/api/groups/${groupId}/join`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to join group");
      }

      toast.success(`Successfully joined "${group.name}"!`);
      router.push(`/dashboard/groups/${groupId}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to join group";
      toast.error(errorMessage);
    } finally {
      setIsJoining(false);
    }
  };

  const handleGoToGroup = () => {
    router.push(`/dashboard/groups/${groupId}`);
  };

  const handleCancel = () => {
    router.push("/dashboard/groups");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading group information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <X className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">
                Unable to Load Group
              </h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={handleCancel}>Go to Groups</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!group) return null;

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={group.customization?.photo_url} />
              <AvatarFallback className="bg-primary/10 text-lg">
                {group.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          <CardTitle className="text-xl">{group.name}</CardTitle>
          <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {group.member_ids.length} member
            {group.member_ids.length !== 1 ? "s" : ""}
          </div>
        </CardHeader>
        <CardContent>
          {alreadyMember ? (
            <div className="text-center space-y-4">
              <Badge variant="secondary" className="text-sm">
                You're already a member
              </Badge>
              <p className="text-muted-foreground">
                You're already part of this group. Click below to go to the
                group chat.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button onClick={handleGoToGroup} className="flex-1">
                  Go to Group
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                You've been invited to join this group. Click join to start
                participating in the conversation.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleJoinGroup}
                  disabled={isJoining}
                  className="flex-1"
                >
                  {isJoining ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Joining...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Join Group
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
