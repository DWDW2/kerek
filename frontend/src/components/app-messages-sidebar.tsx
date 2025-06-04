"use client";
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { LatestMessages } from "@/types/conversation";

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
  console.log(message);
  return (
    <div className="rounded p-4 border">
      <div className="flex flex-col gap-2">
        <div className="text-sm text-gray-500">{message.name}</div>
        <div className="text-sm text-gray-500">{message.message.content}</div>
      </div>
    </div>
  );
};
