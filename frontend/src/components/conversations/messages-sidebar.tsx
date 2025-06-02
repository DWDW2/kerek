import React from "react";
import { Conversation } from "@/types/conversation";
import { Card, CardTitle, CardHeader, CardContent } from "../ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useUser } from "@/hooks/use-user";

type Props = {
  conversations: Conversation[];
};

function ConversationItem({ conversation }: { conversation: Conversation }) {
  const { user: currentUser } = useAuth();

  const otherParticipantId = conversation.participant_ids.find(
    (id) => id !== currentUser?.id
  );

  const { user: otherUser } = useUser(otherParticipantId);

  const displayImage = otherUser?.profile_image_url;
  const displayName =
    otherUser?.username || conversation.name || "Unknown User";
  const fallbackInitial = displayName[0]?.toUpperCase() || "U";

  return (
    <Link
      href={`/dashboard/conversations/${conversation.id}`}
      key={conversation.id}
    >
      <div className="p-4 border w-full cursor-pointer flex flex-row gap-3 items-center hover:bg-accent/50 transition-colors rounded-lg">
        <Avatar className="w-12 h-12 border-2 border-border">
          <AvatarImage src={displayImage} alt={displayName} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {fallbackInitial}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{displayName}</div>
          {conversation.last_message && (
            <div className="text-xs text-muted-foreground truncate">
              {conversation.last_message.content}
            </div>
          )}
          <div className="flex items-center gap-2 mt-1">
            {otherUser?.is_online && (
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            )}
            <span className="text-xs text-muted-foreground">
              {otherUser?.is_online ? "Online" : "Offline"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function MessagesSidebar({ conversations }: Props) {
  return (
    <Card className="h-full rounded-none space-y-0">
      <CardHeader className="border-b m-0">
        <CardTitle className="text-lg">Messages</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col min-h-screen p-0">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="text-muted-foreground mb-2">
              No conversations yet
            </div>
            <div className="text-sm text-muted-foreground">
              Start a conversation by clicking on a user in the graph
            </div>
          </div>
        ) : (
          conversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
