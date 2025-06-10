"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { UserSearch } from "@/components/ui/user-search";
import { useGroups } from "@/hooks/use-groups";
import { Users, X, Copy } from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  username: string;
  email: string;
}

interface CreateGroupDialogProps {
  trigger?: React.ReactNode;
}

export function CreateGroupDialog({ trigger }: CreateGroupDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [createdGroupId, setCreatedGroupId] = useState<string | null>(null);
  const [showInviteLink, setShowInviteLink] = useState(false);

  const { createGroup, isCreating } = useGroups();

  const handleUserSelect = (user: User) => {
    if (!selectedUsers.find((u) => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter((user) => user.id !== userId));
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error("Group name is required");
      return;
    }

    if (selectedUsers.length === 0) {
      toast.error("At least one member is required");
      return;
    }

    try {
      const group = await createGroup({
        name: groupName.trim(),
        member_ids: selectedUsers.map((user) => user.id),
      });

      setCreatedGroupId(group.id);
      setShowInviteLink(true);

      setGroupName("");
      setSelectedUsers([]);
    } catch (error) {}
  };

  const generateInviteLink = () => {
    if (!createdGroupId) return "";
    return `${window.location.origin}/invite/group/${createdGroupId}`;
  };

  const copyInviteLink = async () => {
    const link = generateInviteLink();
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Invite link copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setShowInviteLink(false);
    setCreatedGroupId(null);
    setGroupName("");
    setSelectedUsers([]);
  };

  return (
    <Dialog onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button>
          <Users className="h-4 w-4" />
          <span>Create Group</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {showInviteLink
              ? "Group Created Successfully!"
              : "Create New Group"}
          </DialogTitle>
        </DialogHeader>

        {showInviteLink ? (
          <div className="grid gap-4 py-4">
            <div className="text-center">
              <div className="text-lg font-medium text-green-600 mb-2">
                Group "{groupName}" created successfully!
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Share this link to invite more members to your group:
              </p>
              <div className="flex gap-2">
                <Input
                  value={generateInviteLink()}
                  readOnly
                  className="text-sm"
                />
                <Button variant="outline" size="sm" onClick={copyInviteLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex justify-center">
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="group-name">Group Name</Label>
              <Input
                id="group-name"
                placeholder="Enter group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>

            <Separator />

            <div className="grid gap-2">
              <Label>Add Members</Label>
              <UserSearch
                onUserSelect={handleUserSelect}
                excludeUserIds={selectedUsers.map((user) => user.id)}
                placeholder="Search users by username or email..."
              />
            </div>

            {selectedUsers.length > 0 && (
              <div className="grid gap-2">
                <Label>Selected Members ({selectedUsers.length})</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((user) => (
                    <Badge
                      key={user.id}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {user.username}
                      <button
                        type="button"
                        onClick={() => handleRemoveUser(user.id)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateGroup}
                disabled={
                  isCreating || !groupName.trim() || selectedUsers.length === 0
                }
              >
                {isCreating ? "Creating..." : "Create Group"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
