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
  Settings2,
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
import { useAuth } from "@/context/auth-context";
import Image from "next/image";
import { cn } from "@/lib/utils";

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
  const [animationTrigger, setAnimationTrigger] = React.useState(0);
  const [isAnimating, setIsAnimating] = React.useState(false);

  const handleNavClick = () => {
    setIsAnimating(true);
    setAnimationTrigger((prev) => prev + 1);
    setTimeout(() => setIsAnimating(false), 1000);
  };

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="p-4 relative overflow-hidden">
        <>
          <Link href="/">
            <h2 className="text-xl font-semibold text-black mb-1">Kerek</h2>
          </Link>
          <div className="w-6 h-0.5 bg-black rounded-full"></div>
        </>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarMenu>
          {navigationData.mainNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild>
                  <Link
                    href={item.href}
                    onClick={handleNavClick}
                    className={cn(
                      "flex items-center gap-2 font-medium text-sm transition-all duration-300 hover:text-foreground hover:bg-primary/10 rounded-lg p-3 group",
                      isActive
                        ? "text-primary font-semibold bg-primary/10 shadow-sm"
                        : "text-muted-foreground hover:text-primary"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 transition-all duration-300",
                        isActive && "text-primary"
                      )}
                    />
                    <span className="transition-all duration-300">
                      {item.title}
                    </span>
                    {isActive && (
                      <div className="ml-auto w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>

        <div className="my-6 h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>

        <SidebarMenu>
          {navigationData.secondaryNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild>
                  <Link
                    href={item.href}
                    onClick={handleNavClick}
                    className={cn(
                      "flex items-center gap-2 text-sm transition-all duration-300 hover:text-foreground hover:bg-gray-50 rounded-lg p-3 group",
                      isActive
                        ? "text-foreground font-semibold bg-gray-50"
                        : "text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 transition-colors duration-300 group-hover:text-gray-700" />
                    <span className="transition-colors duration-300">
                      {item.title}
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="py-3 px-3 border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link
                href="/dashboard/profile"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-all duration-300 group"
              >
                <div className="relative">
                  <Image
                    src={"/avatar.png"}
                    alt={user?.username || "User"}
                    className="h-8 w-8 rounded-full ring-2 ring-purple-100 transition-all duration-300 group-hover:ring-purple-200"
                    width={32}
                    height={32}
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {user?.username}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
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
