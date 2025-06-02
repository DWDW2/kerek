import { useContext } from "react";
import { OnlineStatusContext } from "@/components/providers/online-status-provider";

export function useOnlineStatus() {
  const context = useContext(OnlineStatusContext);
  if (context === undefined) {
    throw new Error(
      "useOnlineStatus must be used within an OnlineStatusProvider"
    );
  }
  return context;
}
