import { Sidebar } from "@excalidraw/excalidraw/components/Sidebar/Sidebar";
import React from "react";
import { SidebarGroup, SidebarContent, SidebarHeader } from "./ui/sidebar";

type Props = {};

export default function AppSidebar({}: Props) {
  return (
    <Sidebar name="kerek" docked={true}>
      <SidebarHeader>Kerek</SidebarHeader>
      <SidebarContent>
        <SidebarGroup></SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
