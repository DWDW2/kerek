"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";

interface OnlineStatusContextType {
  isOnline: boolean;
}

export const OnlineStatusContext = createContext<OnlineStatusContextType>({
  isOnline: false,
});

export function OnlineStatusProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOnline, setIsOnline] = useState(false);
  const { user, token } = useAuth();

  const setUserOnlineStatus = async (status: boolean) => {
    if (!user?.id) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/users/online`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ id: user.id }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update online status");
      }

      setIsOnline(status);
    } catch (error) {
      console.error("Error updating online status:", error);
    }
  };

  useEffect(() => {
    if (!user?.id) return;

    setUserOnlineStatus(true);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setUserOnlineStatus(true);
      } else {
        setUserOnlineStatus(false);
      }
    };

    const handleBeforeUnload = () => {
      setUserOnlineStatus(false);
    };

    const handleOnline = () => {
      setUserOnlineStatus(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      setUserOnlineStatus(false);
    };
  }, [user?.id]);

  return (
    <OnlineStatusContext.Provider value={{ isOnline }}>
      {children}
    </OnlineStatusContext.Provider>
  );
}

export function useOnlineStatus() {
  const context = useContext(OnlineStatusContext);
  if (context === undefined) {
    throw new Error(
      "useOnlineStatus must be used within an OnlineStatusProvider"
    );
  }
  return context;
}
