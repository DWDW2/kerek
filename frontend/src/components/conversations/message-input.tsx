"use client";

import { useState } from "react";
import { SendHorizontal, Smile } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface MessageInputProps {
  isConnected: boolean;
  isSending: boolean;
  wsError: string | null;
  newMessage: string;
  setNewMessage: (message: string) => void;
  onSendMessage: (event: React.FormEvent) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({
  isConnected,
  isSending,
  wsError,
  newMessage,
  setNewMessage,
  onSendMessage,
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage((prev) => prev + emojiData.emoji);
  };

  return (
    <form onSubmit={onSendMessage} className="flex space-x-3">
      <div className="flex-1 relative">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={
            isConnected
              ? "Type a message..."
              : wsError
              ? "Connection error. Please try again."
              : "Connecting..."
          }
          disabled={!isConnected || isSending}
          className="flex-1 py-6 text-base rounded-full px-5 shadow-sm border-muted-foreground/20 pr-12"
        />
        <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full hover:bg-muted"
            >
              <Smile className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="end">
            <EmojiPicker
              onEmojiClick={onEmojiClick}
              width="100%"
              height={400}
            />
          </PopoverContent>
        </Popover>
      </div>
      <Button
        type="submit"
        size="icon"
        disabled={!isConnected || isSending}
        className="shrink-0 rounded-full h-12 w-12 shadow-md"
      >
        <SendHorizontal className="h-5 w-5" />
      </Button>
    </form>
  );
};

export default MessageInput;
