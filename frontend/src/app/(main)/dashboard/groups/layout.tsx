"use client";

import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

export default function GroupsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isGroupChat =
    pathname.includes("/groups/") && pathname.split("/").length > 4;
  return (
    <div
      className={cn(
        "flex-1 space-y-4",
        isGroupChat && "",
        !isGroupChat && "p-4 md:p-8 pt-6"
      )}
    >
      <div className="mx-auto max-w-7xl">{children}</div>
    </div>
  );
}
