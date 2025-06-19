"use client";
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { LatestMessages } from "@/types/conversation";
import { useUser } from "@/hooks/use-user";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import Link from "next/link";
import { MessageSquareIcon, Regex } from "lucide-react";
import { usePathname } from "next/navigation";

type Props = {
  getLatestMessages: (token: string) => Promise<LatestMessages[]>;
};

export function AppMessagesSidebar({ getLatestMessages }: Props) {
  const [latestMessages, setLatestMessages] = useState<LatestMessages[]>([]);
	const pattern = /^\/conversations\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
 const pathname = usePathname();
  useEffect(() => {
    const fetchLatestMessages = async () => {
      const messages = await getLatestMessages(
        localStorage.getItem("auth_token") || ""
      );
      setLatestMessages(messages);
    };
    fetchLatestMessages();
  }, [getLatestMessages]);
  return !pathname.includes("/canvas") && !pathname.includes("/code-editor") && pattern.test(pathname) ? (
    <>
      <Card className="flex-col gap-2 w-[16 rem] py-0 pb-6 hidden md:flex">
        <CardHeader className="border-b [.border-b]:pb-0 px-0 h-[60px] p-6">
          <div className="text-lg text-gray-500 font-semibold">Messages</div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 px-2">
          {latestMessages.map((message) => (
            <MessageItem key={message.id} message={message} />
          ))}
        </CardContent>
      </Card>
      <div className="rounded-full h-12 w-12 fixed bottom-5 right-5 bg-primary text-white flex items-center justify-center md:hidden">
        <MessageSquareIcon />
      </div>
    </>
  ) : (
    <></>
  );
}

const MessageItem = ({ message }: { message: LatestMessages }) => {
  const otherParticipantId = message.other_user;
  const { user: otherUser } = useUser(otherParticipantId);

  const displayImage = otherUser?.profile_image_url;
  const displayName = otherUser?.username || message.name || "Unknown User";
  const fallbackInitial = displayName[0]?.toUpperCase() || "U";

  return (
    <Link href={`/dashboard/conversations/${message.id}`}>
      <div className="rounded p-4 border flex flex-row gap-2 hover:bg-gray-50 cursor-pointer">
        <Avatar className="w-12 h-12 border-2 border-border">
          <AvatarImage src={displayImage} alt={displayName} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {fallbackInitial}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-row justify-between w-full">
          <div className="flex flex-col gap-2">
            <div className="text-sm text-gray-500 font-semibold">
              {displayName}
            </div>
            <div className="text-sm text-gray-400">
              {message.message.content}
            </div>
          </div>
          <div className="text-sm text-gray-500">
            {new Date(message.message.created_at).toLocaleString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })}
          </div>
        </div>
      </div>
    </Link>
  );
};
