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
import { useGroups } from "@/hooks/use-groups";
import { Users, X, Plus } from "lucide-react";
import { toast } from "sonner";

interface CreateGroupDialogProps {
  trigger?: React.ReactNode;
}

export function CreateGroupDialog({ trigger }: CreateGroupDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [memberInput, setMemberInput] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);

  const { createGroup, isCreating } = useGroups();

  const handleAddMember = () => {
    if (memberInput.trim() && !memberIds.includes(memberInput.trim())) {
      setMemberIds([...memberIds, memberInput.trim()]);
      setMemberInput("");
    }
  };

  const handleRemoveMember = (memberId: string) => {
    setMemberIds(memberIds.filter((id) => id !== memberId));
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error("Group name is required");
      return;
    }

    if (memberIds.length === 0) {
      toast.error("At least one member is required");
      return;
    }

    try {
      await createGroup({
        name: groupName.trim(),
        member_ids: memberIds,
      });

      // Reset form
      setGroupName("");
      setMemberIds([]);
      setMemberInput("");
      setIsOpen(false);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddMember();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Users className="mr-2 h-4 w-4" />
            Create Group
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
        </DialogHeader>
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
            <Label htmlFor="member-input">Add Members</Label>
            <div className="flex gap-2">
              <Input
                id="member-input"
                placeholder="Enter member ID or username"
                value={memberInput}
                onChange={(e) => setMemberInput(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddMember}
                disabled={!memberInput.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {memberIds.length > 0 && (
            <div className="grid gap-2">
              <Label>Members ({memberIds.length})</Label>
              <div className="flex flex-wrap gap-2">
                {memberIds.map((memberId) => (
                  <Badge
                    key={memberId}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {memberId}
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(memberId)}
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
              onClick={() => setIsOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateGroup}
              disabled={
                isCreating || !groupName.trim() || memberIds.length === 0
              }
            >
              {isCreating ? "Creating..." : "Create Group"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
