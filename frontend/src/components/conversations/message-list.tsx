"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { AnimatePresence } from "framer-motion";
import MessageItem from "./message-item";
import { Message } from "@/types/conversation";
import { ConversationCustomization } from "@/types/conversation";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useEffect } from "react";

interface MessageListProps {
  messages: Message[];
  hasMore: boolean;
  isLoadingMore: boolean;
  loadOlderMessages: () => void;
  scrollRef: React.RefObject<HTMLDivElement>;
  customization?: ConversationCustomization;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  hasMore,
  isLoadingMore,
  loadOlderMessages,
  scrollRef,
  customization,
}) => {
  const { user } = useAuth();

  useEffect(() => {
    if (!scrollRef.current) return;
    const scrollAreaViewport = scrollRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    );
    if (scrollAreaViewport) {
      scrollAreaViewport.scrollTop = scrollAreaViewport.scrollHeight;
    }
  }, [messages]);

  const backgroundStyle = customization?.background_image_url
    ? {
        backgroundImage: `url(${customization.background_image_url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }
    : {};

  return (
    <div className="w-full">
      <ScrollArea
        ref={scrollRef}
        className="flex-1 px-6 relative h-[76vh]"
        style={backgroundStyle}
      >
        {/* Background overlay for better readability */}
        {customization?.background_image_url && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px]" />
        )}

        <div className="flex flex-col space-y-6 py-6 relative z-10">
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
            {messages.map((message) => {
              const isGifMessage = message.content.match(
                /https:\/\/media\d+\.giphy\.com/
              );
              return (
                <div key={message.id}>
                  {isGifMessage ? (
                    <div
                      className={cn(
                        "relative w-48 h-48",
                        message.sender_id === user?.id ? "ml-auto" : "mr-auto"
                      )}
                    >
                      <Image
                        src={message.content}
                        alt="GIF message"
                        fill
                        className="object-cover rounded-lg"
                      />
                    </div>
                  ) : (
                    <MessageItem
                      message={message}
                      customization={customization}
                    />
                  )}
                </div>
              );
            })}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
};

export default MessageList;
