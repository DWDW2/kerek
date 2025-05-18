import { useState, useEffect } from "react";
import { User as UserProfile } from "@/types/user";

interface UseUserResult {
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
}

export function useUser({ id }: { id: string }): UseUserResult {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/users/profile/${id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch user: ${response.statusText}`);
        }

        const data: UserProfile = await response.json();
        setUser(data);
      } catch (err: any) {
        setError(err.message || "Failed to fetch user");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchUser();
    } else {
      setIsLoading(false);
      setError("User ID is required");
    }
  }, [id]);

  return { user, isLoading, error };
}
