"use client";

import { Group } from "@/types/group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, MessageCircle, Calendar } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

interface GroupCardProps {
  group: Group;
}

export function GroupCard({ group }: GroupCardProps) {
  const formattedDate = format(
    new Date(group.created_at * 1000),
    "MMM d, yyyy"
  );

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={group.customization?.photo_url} />
            <AvatarFallback className="bg-primary/10">
              {group.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-lg">{group.name}</CardTitle>
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="mr-1 h-3 w-3" />
              Created {formattedDate}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center">
              <Users className="mr-1 h-4 w-4" />
              {group.member_ids.length} member
              {group.member_ids.length !== 1 ? "s" : ""}
            </div>
          </div>
          <div className="flex space-x-2">
            <Link href={`/dashboard/groups/${group.id}`}>
              <Button variant="outline" size="sm">
                <MessageCircle className="mr-1 h-4 w-4" />
                View
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
