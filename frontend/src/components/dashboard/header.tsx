"use client";

import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import React from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";

function DashboardBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {segments.map((segment, index) => {
          const href = `/${segments.slice(0, index + 1).join("/")}`;
          const isLast = index === segments.length - 1;
          const label = segment.charAt(0).toUpperCase() + segment.slice(1);

          return (
            <React.Fragment key={href}>
              {index > 0 && <BreadcrumbSeparator />}
              {isLast ? (
                <BreadcrumbPage>{label}</BreadcrumbPage>
              ) : (
                <BreadcrumbItem>
                  <BreadcrumbLink href={href}>{label}</BreadcrumbLink>
                </BreadcrumbItem>
              )}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
export function Header() {
  const pathname = usePathname();
  const isConversationDetail =
    pathname.includes("/conversations/") ||
    (pathname.includes("/groups/") && pathname.split("/").length > 4) ||
    pathname.includes("/invite/group/");

  if (isConversationDetail) {
    return;
  }

  return (
    <header className="flex flex-row w-full p-4 items-center gap-2 border-b">
      <SidebarTrigger />
      <DashboardBreadcrumbs />
    </header>
  );
}
