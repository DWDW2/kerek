import React from "react";
import { Conversation } from "@/types/conversation";
import { Card, CardTitle, CardHeader, CardContent } from "../ui/card";
import Link from "next/link";
type Props = {
  conversations: Conversation[];
};

export default function MessagesSidebar({ conversations }: Props) {
  return (
    <Card className="p-0 px-0">
      <CardHeader>
        <CardTitle>Messages</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex flex-col gap-2 min-w-[200px] min-h-screen">
          {conversations.map((conversation) => (
            <Link
              href={`/dashboard/conversations/${conversation.id}`}
              key={conversation.id}
            >
              <div
                key={conversation.id}
                className="p-4 border w-full cursor-pointer"
              >
                {conversation.name}
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
