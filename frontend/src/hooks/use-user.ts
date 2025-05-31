import { useState, useEffect, useCallback } from "react";
import { User as UserProfile } from "@/types/user";
import { toast } from "sonner";

interface UseUserResult {
  user: UserProfile | null;
  users: UserProfile[];
  isLoading: boolean;
  isFetchingUsers: boolean;
  error: string | null;
  usersError: string | null;
  refetchUser: () => Promise<void>;
  refetchUsers: () => Promise<void>;
}

export function useUser(id?: string): UseUserResult {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingUsers, setIsFetchingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    if (!id) {
      setUser(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(`/api/users/profile/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch user: ${response.status} ${response.statusText}`
        );
      }

      const data: UserProfile = await response.json();
      setUser(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch user";
      console.error("Error fetching user:", err);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const fetchUsers = useCallback(async () => {
    setIsFetchingUsers(true);
    setUsersError(null);

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch("/api/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch users: ${response.status} ${response.statusText}`
        );
      }

      const data: UserProfile[] = await response.json();
      setUsers(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch users";
      console.error("Error fetching users:", err);
      setUsersError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsFetchingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const refetchUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  const refetchUsers = useCallback(async () => {
    await fetchUsers();
  }, [fetchUsers]);

  return {
    user,
    users,
    isLoading,
    isFetchingUsers,
    error,
    usersError,
    refetchUser,
    refetchUsers,
  };
}
