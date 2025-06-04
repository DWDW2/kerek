"use client";
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { LatestMessages } from "@/types/conversation";
import { useUser } from "@/hooks/use-user";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";

type Props = {
  getLatestMessages: (token: string) => Promise<LatestMessages[]>;
};

export function AppMessagesSidebar({ getLatestMessages }: Props) {
  const [latestMessages, setLatestMessages] = useState<LatestMessages[]>([]);

  useEffect(() => {
    const fetchLatestMessages = async () => {
      const messages = await getLatestMessages(
        localStorage.getItem("auth_token") || ""
      );
      setLatestMessages(messages);
    };
    fetchLatestMessages();
  }, [getLatestMessages]);

  return (
    <Card className="flex flex-col gap-2">
      <CardHeader>
        <CardTitle>Messages</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 px-2">
        {latestMessages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
      </CardContent>
    </Card>
  );
}

const MessageItem = ({ message }: { message: LatestMessages }) => {
  const otherParticipantId = message.other_user;
  const { user: otherUser } = useUser(otherParticipantId);
  console.log(otherUser);
  const displayImage = otherUser?.profile_image_url;
  const displayName = otherUser?.username || message.name || "Unknown User";
  const fallbackInitial = displayName[0]?.toUpperCase() || "U";

  return (
    <div className="rounded p-4 border flex flex-row gap-2">
      <Avatar className="w-12 h-12 border-2 border-border">
        <AvatarImage src={displayImage} alt={displayName} />
        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
          {fallbackInitial}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-2">
        <div className="text-sm text-gray-500">{displayName}</div>
        <div className="text-sm text-gray-500">{message.message.content}</div>
      </div>
    </div>
  );
};
