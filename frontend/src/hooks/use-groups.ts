import { useState, useEffect, useCallback } from "react";
import {
  Group,
  NewGroup,
  GroupMessage,
  AddMemberRequest,
  RemoveMemberRequest,
  UpdateGroupRequest,
} from "@/types/group";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function useGroups(groupId?: string) {
  const router = useRouter();
  const [group, setGroup] = useState<Group | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGroup = useCallback(async () => {
    if (!groupId) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(`/api/groups/${groupId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load group: ${response.status}`);
      }

      const data = await response.json();
      setGroup(data);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load group";
      console.error("Failed to load group details:", error);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  const refetch = useCallback(() => {
    if (groupId) {
      setIsLoading(true);
      loadGroup();
    }
  }, [groupId, loadGroup]);

  const createGroup = useCallback(
    async (payload: NewGroup) => {
      try {
        setIsCreating(true);
        setError(null);

        const token = localStorage.getItem("auth_token");
        if (!token) {
          throw new Error("No authentication token found");
        }

        const response = await fetch("/api/groups", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Failed to create group: ${response.status}`);
        }

        const group = await response.json();

        router.push(`/dashboard/groups/${group.id}`);
        toast.success("Group created successfully");
        return group;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to create group";
        console.error("Error creating group:", error);
        setError(errorMessage);
        toast.error(errorMessage);
        throw error;
      } finally {
        setIsCreating(false);
      }
    },
    [router]
  );

  const fetchGroups = useCallback(async () => {
    try {
      setIsFetching(true);
      setError(null);

      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch("/api/groups", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch groups: ${response.status}`);
      }

      const data = await response.json();
      setGroups(data);
      return data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch groups";
      console.error("Error fetching groups:", error);
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsFetching(false);
    }
  }, []);

  const updateGroup = useCallback(
    async (groupId: string, payload: UpdateGroupRequest) => {
      try {
        setError(null);
        const token = localStorage.getItem("auth_token");
        if (!token) {
          throw new Error("No authentication token found");
        }

        const response = await fetch(`/api/groups/${groupId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Failed to update group: ${response.status}`);
        }

        const updatedGroup = await response.json();
        setGroup(updatedGroup);
        toast.success("Group updated successfully");
        return updatedGroup;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to update group";
        console.error("Error updating group:", error);
        setError(errorMessage);
        toast.error(errorMessage);
        throw error;
      }
    },
    []
  );

  const addMember = useCallback(
    async (groupId: string, payload: AddMemberRequest) => {
      try {
        setError(null);
        const token = localStorage.getItem("auth_token");
        if (!token) {
          throw new Error("No authentication token found");
        }

        const response = await fetch(`/api/groups/${groupId}/members`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Failed to add member: ${response.status}`);
        }

        const updatedGroup = await response.json();
        setGroup(updatedGroup);
        toast.success("Member added successfully");
        return updatedGroup;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to add member";
        console.error("Error adding member:", error);
        setError(errorMessage);
        toast.error(errorMessage);
        throw error;
      }
    },
    []
  );

  const removeMember = useCallback(
    async (groupId: string, payload: RemoveMemberRequest) => {
      try {
        setError(null);
        const token = localStorage.getItem("auth_token");
        if (!token) {
          throw new Error("No authentication token found");
        }

        const response = await fetch(`/api/groups/${groupId}/members`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Failed to remove member: ${response.status}`);
        }

        const updatedGroup = await response.json();
        setGroup(updatedGroup);
        toast.success("Member removed successfully");
        return updatedGroup;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to remove member";
        console.error("Error removing member:", error);
        setError(errorMessage);
        toast.error(errorMessage);
        throw error;
      }
    },
    []
  );

  const deleteGroup = useCallback(
    async (groupId: string) => {
      try {
        setError(null);
        const token = localStorage.getItem("auth_token");
        if (!token) {
          throw new Error("No authentication token found");
        }

        const response = await fetch(`/api/groups/${groupId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to delete group: ${response.status}`);
        }

        toast.success("Group deleted successfully");
        router.push("/dashboard/groups");
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to delete group";
        console.error("Error deleting group:", error);
        setError(errorMessage);
        toast.error(errorMessage);
        throw error;
      }
    },
    [router]
  );

  const leaveGroup = useCallback(
    async (groupId: string) => {
      try {
        setError(null);
        const token = localStorage.getItem("auth_token");
        if (!token) {
          throw new Error("No authentication token found");
        }

        const response = await fetch(`/api/groups/${groupId}/leave`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to leave group: ${response.status}`);
        }

        toast.success("Left group successfully");
        router.push("/dashboard/groups");
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to leave group";
        console.error("Error leaving group:", error);
        setError(errorMessage);
        toast.error(errorMessage);
        throw error;
      }
    },
    [router]
  );

  useEffect(() => {
    if (groupId) {
      loadGroup();
    } else {
      setIsLoading(false);
      setGroup(null);
    }
  }, [groupId, loadGroup]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  return {
    group,
    groups,
    messages,
    isLoading,
    isCreating,
    isFetching,
    error,
    refetch,
    createGroup,
    fetchGroups,
    updateGroup,
    addMember,
    removeMember,
    deleteGroup,
    leaveGroup,
  };
}
