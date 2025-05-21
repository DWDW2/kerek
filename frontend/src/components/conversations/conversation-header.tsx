"use client";
import { CardTitle } from "@/components/ui/card";
import { User } from "@/types/user";

interface ConversationHeaderProps {
  reciever: User;
}

const ConversationHeader: React.FC<ConversationHeaderProps> = ({
  reciever,
}) => {
  console.log(reciever);
  return (
    <div className="flex items-center justify-between">
      <CardTitle className="text-xl font-semibold flex items-center gap-2">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
          {reciever?.username?.charAt(0).toUpperCase()}
        </div>
        <span>Chat with {reciever?.username}</span>
      </CardTitle>
    </div>
  );
};

export default ConversationHeader;
