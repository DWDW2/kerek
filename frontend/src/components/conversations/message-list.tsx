"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { AnimatePresence } from "framer-motion";
import MessageItem from "./message-item";
import { Message } from "@/types/conversation";
interface MessageListProps {
  messages: Message[];
  hasMore: boolean;
  isLoadingMore: boolean;
  loadOlderMessages: () => void;
  scrollRef: React.RefObject<HTMLDivElement>;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  hasMore,
  isLoadingMore,
  loadOlderMessages,
  scrollRef,
}) => {
  return (
    <ScrollArea ref={scrollRef} className="flex-1 px-6 ">
      <div className="flex flex-col space-y-6 py-6">
        {hasMore && (
          <div className="flex justify-center">
            <Button
              size="sm"
              variant="outline"
              onClick={loadOlderMessages}
              disabled={isLoadingMore}
              className="bg-background/50 backdrop-blur-sm"
            >
              {isLoadingMore ? "Loading..." : "Load older messages"}
            </Button>
          </div>
        )}
        <AnimatePresence>
          {messages.map((message) => (
            <MessageItem key={message.id} message={message} />
          ))}
        </AnimatePresence>
      </div>
    </ScrollArea>
  );
};

export default MessageList;
