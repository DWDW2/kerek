import { ProtectedRoute } from "@/components/auth/protected-route";
import { OnlineStatusProvider } from "@/components/providers/online-status-provider";
import React from "react";

type Props = {
  children: React.ReactNode;
};

export default function layout({ children }: Props) {
  return (
    <OnlineStatusProvider>
      <ProtectedRoute>{children}</ProtectedRoute>
    </OnlineStatusProvider>
  );
}
