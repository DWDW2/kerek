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
  Users,
  Code2,
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
import { useIsMobile } from "@/hooks/use-mobile";

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
      title: "Groups",
      href: "/dashboard/groups",
      icon: Users,
    },
    {
      title: "Posts",
      href: "/dashboard/posts",
      icon: Code2,
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
  const isMobile = useIsMobile();
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
        <Link href="/" className="flex flex-col items-center">
          <h2 className="text-xl font-semibold text-black mb-1">K</h2>
          <div className="w-6 h-0.5 bg-black rounded-full"></div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarMenu className="space-y-2">
          {navigationData.mainNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild className="h-12 w-full p-0">
                  <Link
                    href={item.href}
                    onClick={handleNavClick}
                    title={item.title}
                    className={cn(
                      "flex items-center w-full h-12 font-medium transition-all duration-300 hover:text-foreground hover:bg-primary/10 rounded-lg group",
                      isActive
                        ? "text-primary font-semibold bg-primary/10 shadow-sm"
                        : "text-muted-foreground hover:text-primary",
                      isMobile ? "px-4" : "justify-center"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-7 w-7 transition-all duration-300 shrink-0",
                        isActive && "text-primary"
                      )}
                    />
                    {isMobile && <span className="ml-3">{item.title}</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>

        <div className="my-6 h-px bg-gradient-to-r from-transparent via-border to-transparent mx-2"></div>

        <SidebarMenu className="space-y-2">
          {navigationData.secondaryNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild className="w-full h-12">
                  <Link
                    href={item.href}
                    onClick={handleNavClick}
                    title={item.title}
                    className={cn(
                      "flex items-center w-full h-12 transition-all duration-300 hover:text-foreground hover:bg-gray-50 rounded-lg group",
                      isActive
                        ? "text-foreground font-semibold bg-gray-50"
                        : "text-muted-foreground",
                      isMobile ? "px-4" : "justify-center"
                    )}
                  >
                    <Icon className="h-7 w-7 transition-colors duration-300 group-hover:text-gray-700 shrink-0" />
                    {isMobile && <span className="ml-3">{item.title}</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="py-3 px-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="w-full h-12">
              <Link
                href="/dashboard/profile"
                className={cn(
                  "flex items-center w-full h-12 rounded-lg hover:bg-gray-50 transition-all duration-300 group relative",
                  isMobile ? "px-4" : "justify-center"
                )}
                title="Profile"
              >
                <div className="relative">
                  <Image
                    src={"/avatar.png"}
                    alt={user?.username || "User"}
                    className="h-10 w-10 rounded-full ring-2 ring-purple-100 transition-all duration-300 group-hover:ring-purple-200"
                    width={40}
                    height={40}
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                </div>
                {isMobile && (
                  <span className="ml-3">{user?.username || "Profile"}</span>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
