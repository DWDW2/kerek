import React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
type Props = {
  children: React.ReactNode;
};

export default function layout({ children }: Props) {
  return (
    <>
      <SidebarProvider>{children}</SidebarProvider>
    </>
  );
}
