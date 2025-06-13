"use client";

import { useParams } from "next/navigation";
import { useGroups } from "@/hooks/use-groups";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  Settings,
  UserPlus,
  UserMinus,
  LogOut,
  Trash2,
  Edit,
  Calendar,
  MessageCircle,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useUser } from "@/hooks/use-user";



export default function GroupDetailPage() {
  const params = useParams();
  const groupId = params.groupId as string;

  const {
    group,
    isLoading,
    error,
    refetch,
    updateGroup,
    addMember,
    removeMember,
    leaveGroup,
    deleteGroup,
  } = useGroups(groupId);

  const {users} = useUser()

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [newMemberId, setNewMemberId] = useState("");
  const [isAddingMember, setIsAddingMember] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-destructive">
          Error loading group: {error || "Group not found"}
        </p>
        <Button onClick={refetch} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  const handleUpdateName = async () => {
    if (!editName.trim()) {
      toast.error("Group name cannot be empty");
      return;
    }

    try {
      await updateGroup(groupId, { name: editName.trim() });
      setIsEditing(false);
    } catch (error) {
    }
  };

  const handleAddMember = async () => {
    if (!newMemberId.trim()) {
      toast.error("Member ID cannot be empty");
      return;
    }

    try {
      await addMember(groupId, { user_id: newMemberId.trim() });
      setNewMemberId("");
      setIsAddingMember(false);
    } catch (error) {
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await removeMember(groupId, { user_id: memberId });
    } catch (error) {
    }
  };

  const handleLeaveGroup = async () => {
    if (confirm("Are you sure you want to leave this group?")) {
      try {
        await leaveGroup(groupId);
      } catch (error) {
      }
    }
  };

  const handleDeleteGroup = async () => {
    if (
      confirm(
        "Are you sure you want to delete this group? This action cannot be undone."
      )
    ) {
      try {
        await deleteGroup(groupId);
      } catch (error) {
      }
    }
  };

  const formattedDate = format(
    new Date(group.created_at * 1000),
    "MMMM d, yyyy 'at' h:mm a"
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={group.customization?.photo_url} />
            <AvatarFallback className="bg-primary/10 text-2xl">
              {group.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            {isEditing ? (
              <div className="flex items-center space-x-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-2xl font-bold"
                  onKeyPress={(e) => e.key === "Enter" && handleUpdateName()}
                />
                <Button onClick={handleUpdateName} size="sm">
                  Save
                </Button>
                <Button
                  onClick={() => {
                    setIsEditing(false);
                    setEditName("");
                  }}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <h1 className="text-3xl font-bold">{group.name}</h1>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditName(group.name);
                    setIsEditing(true);
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="flex items-center text-sm text-muted-foreground mt-1">
              <Calendar className="mr-1 h-4 w-4" />
              Created {formattedDate}
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <Link href={`/dashboard/groups/${groupId}/chat`}>
            <Button>
              <MessageCircle className="mr-2 h-4 w-4" />
              Open Chat
            </Button>
          </Link>
          <Button variant="outline" onClick={handleLeaveGroup}>
            <LogOut className="mr-2 h-4 w-4" />
            Leave
          </Button>
          <Button variant="destructive" onClick={handleDeleteGroup}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <Separator />

      {/* Members Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Members ({group.member_ids.length})
            </CardTitle>
            <Dialog open={isAddingMember} onOpenChange={setIsAddingMember}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Member</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="member-id">Member ID or Username</Label>
                    <Input
                      id="member-id"
                      value={newMemberId}
                      onChange={(e) => setNewMemberId(e.target.value)}
                      placeholder="Enter member ID or username"
                      onKeyPress={(e) => e.key === "Enter" && handleAddMember()}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsAddingMember(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddMember}
                      disabled={!newMemberId.trim()}
                    >
                      Add Member
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {group.member_ids.map((memberId) => (
              <div
                key={memberId}
                className="flex items-center justify-between p-2 rounded-lg border"
              >
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {memberId.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{users.find(user => user.id === memberId)?.username}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveMember(memberId)}
                  className="text-destructive hover:text-destructive"
                >
                  <UserMinus className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
