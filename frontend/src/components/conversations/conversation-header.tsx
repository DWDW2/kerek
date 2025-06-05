"use client";
import { CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "@/types/user";

interface ConversationHeaderProps {
  reciever: User;
}

const ConversationHeader: React.FC<ConversationHeaderProps> = ({
  reciever,
}) => {
  return (
    <div className="flex items-center justify-between">
      <CardTitle className="text-xl font-semibold flex items-center gap-3">
        <div className="relative">
          <Avatar className="w-10 h-10 border-2 border-border">
            <AvatarImage
              src={reciever?.profile_image_url}
              alt={reciever?.username || "User"}
            />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {reciever?.username?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          {reciever?.is_online && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-lg">Chat with {reciever?.username}</span>
          <span className="text-sm font-normal text-muted-foreground">
            {reciever?.is_online ? "Online" : "Offline"}
          </span>
        </div>
      </CardTitle>
    </div>
  );
};

export default ConversationHeader;
