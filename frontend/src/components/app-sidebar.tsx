"use client";

import * as React from "react";
import {
  UserCircle,
  MessageSquare,
  BarChart2,
  Bot,
  Settings,
  HelpCircle,
  Search,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Image from "next/image";
import { cn } from "@/lib/utils"; // Assuming you have a utility for classnames

const navigationData = {
  mainNav: [
    {
      title: "Profile",
      href: "/dashboard/profile",
      icon: UserCircle,
    },
    {
      title: "Conversations",
      href: "/dashboard/conversations",
      icon: MessageSquare,
    },
    {
      title: "Dashboard",
      href: "/dashboard/",
      icon: BarChart2,
    },
    {
      title: "AI Assistant",
      href: "/dashboard/assistant",
      icon: Bot,
    },
  ],
  secondaryNav: [
    {
      title: "Settings",
      href: "/dashboard/settings",
      icon: Settings,
    },
    {
      title: "Help",
      href: "/dashboard/help",
      icon: HelpCircle,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/dashboard" className="flex items-center gap-2">
                <span className="text-xl font-bold">Kerek</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4 ">
        <SidebarMenu>
          {navigationData.mainNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 font-medium text-sm transition-colors hover:text-foreground",
                      isActive
                        ? "text-foreground font-semibold"
                        : "text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>

        <SidebarMenu className="mt-6">
          {navigationData.secondaryNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 text-sm transition-colors hover:text-foreground",
                      isActive
                        ? "text-foreground font-semibold"
                        : "text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="py-3 px-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link
                href="/dashboard/profile"
                className="flex items-center gap-2"
              >
                <Image
                  src={"/avatar.png"}
                  alt={user?.username || "User"}
                  className="h-7 w-7 rounded-full"
                  width={28}
                  height={28}
                />
                <div className="flex flex-col ">
                  <span className="text-sm font-medium">{user?.username}</span>
                  <span className="text-xs text-muted-foreground">
                    {user?.email}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
