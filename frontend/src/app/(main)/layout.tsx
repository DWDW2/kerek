import React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ProtectedRoute } from "@/components/auth/protected-route";
type Props = {
  children: React.ReactNode;
};

export default function layout({ children }: Props) {
  return (
    <>
      <ProtectedRoute>
        <SidebarProvider>{children}</SidebarProvider>
      </ProtectedRoute>
    </>
  );
}
