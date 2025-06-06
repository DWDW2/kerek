"use client";

import { useGroups } from "@/hooks/use-groups";
import { CreateGroupDialog } from "@/components/groups/create-group-dialog";
import { GroupCard } from "@/components/groups/group-card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Users, Plus } from "lucide-react";

export default function GroupsPage() {
  const { groups, isLoading, isFetching, error, fetchGroups } = useGroups();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-destructive">Error loading groups: {error}</p>
        <Button onClick={fetchGroups} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Groups</h1>
        </div>
        <CreateGroupDialog
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Group
            </Button>
          }
        />
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Users className="h-16 w-16 text-muted-foreground" />
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold">No groups yet</h2>
            <p className="text-muted-foreground">
              Create your first group to start collaborating with others.
            </p>
          </div>
          <CreateGroupDialog />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}
