"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";

interface OnlineStatusContextType {
  isOnline: boolean;
}

const OnlineStatusContext = createContext<OnlineStatusContextType>({
  isOnline: false,
});

export function OnlineStatusProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOnline, setIsOnline] = useState(false);
  const { user } = useAuth();

  const setUserOnlineStatus = async (status: boolean) => {
    if (!user?.id) return;

    try {
      const response = await fetch("/api/users/online", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: user.id }),
      });

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

    // Set user online when component mounts
    setUserOnlineStatus(true);

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setUserOnlineStatus(true);
      } else {
        setUserOnlineStatus(false);
      }
    };

    // Handle beforeunload
    const handleBeforeUnload = () => {
      setUserOnlineStatus(false);
    };

    // Handle online/offline events
    const handleOnline = () => {
      setUserOnlineStatus(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    // Add event listeners
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Cleanup function
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
