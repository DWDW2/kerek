"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { useEffect, useRef } from "react";

import { GroupMessage } from "@/types/group-message";

interface GroupMessageListProps {
  messages: GroupMessage[];
  hasMore?: boolean;
  isLoadingMore?: boolean;
  loadOlderMessages?: () => void;
  scrollRef?: React.RefObject<HTMLDivElement>;
}

const GroupMessageList: React.FC<GroupMessageListProps> = ({
  messages,
  hasMore = false,
  isLoadingMore = false,
  loadOlderMessages,
  scrollRef,
}) => {
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const renderMessageContent = (content: string) => {
    const isGifMessage = content.match(/https:\/\/media\d+\.giphy\.com/);

    if (isGifMessage) {
      return (
        <div className="relative w-48 h-48 overflow-hidden rounded-lg">
          <Image
            src={content}
            alt="GIF message"
            fill
            className="object-cover rounded-lg"
            unoptimized
          />
        </div>
      );
    }

    return <p className="text-base leading-relaxed">{content}</p>;
  };

  return (
    <div className="w-full">
      <ScrollArea ref={scrollRef} className="flex-1 px-6 relative h-[75vh]">
        <div className="flex flex-col space-y-6 py-6 relative z-10">
          {hasMore && loadOlderMessages && (
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
            {messages.map((message) => {
              const isOwnMessage = message.sender_id === user?.id;

              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    "flex w-full",
                    isOwnMessage ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-5 py-3.5 shadow-sm",
                      isOwnMessage
                        ? "bg-primary text-primary-foreground rounded-tr-none"
                        : "bg-muted text-foreground rounded-tl-none"
                    )}
                  >
                    {renderMessageContent(message.content)}
                    <p className="text-xs mt-2 opacity-70 text-right">
                      {new Date(message.created_at * 1000).toLocaleTimeString(
                        [],
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
    </div>
  );
};

export default GroupMessageList;
