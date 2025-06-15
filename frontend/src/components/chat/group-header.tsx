"use client";

import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface GroupHeaderProps {
  groupId: string;
  groupName?: string;
  memberCount?: number;
}

export function GroupHeader({
  groupId,
  groupName,
  memberCount,
}: GroupHeaderProps) {
  return (
    <>
      <Link href="/dashboard">
        <ArrowLeftIcon className="h-5 w-5 hover:text-primary transition-colors cursor-pointer" />
      </Link>
      <div className="flex items-center gap-3 flex-1">
        <Avatar className="h-10 w-10 border-2 border-border">
          <AvatarImage src="" alt={groupName || "Group"} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {groupName?.[0]?.toUpperCase() || "G"}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <h2 className="text-lg font-semibold text-foreground">
            {groupName || `Group ${groupId}`}
          </h2>
          {memberCount && (
            <p className="text-sm text-muted-foreground">
              {memberCount} member{memberCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
