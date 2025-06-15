"use client";

import { useState } from "react";
import { SendHorizontal, Smile } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import MediaPicker from "./media-picker";

interface MessageInputProps {
  isConnected: boolean;
  isSending: boolean;
  wsError: string | null;
  newMessage: string;
  setNewMessage: React.Dispatch<React.SetStateAction<string>>;
  onSendContent: (content: string) => Promise<void>;
}

const MessageInput: React.FC<MessageInputProps> = ({
  isConnected,
  isSending,
  wsError,
  newMessage,
  setNewMessage,
  onSendContent,
}) => {
  const onEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage((prev) => prev + emojiData.emoji);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !isConnected || isSending) return;
    try {
      await onSendContent(newMessage.trim());
      setNewMessage("");
    } catch (error) {
      console.error("MessageInput: Error sending message:", error);
    }
  };

  const handleSendGif = async (gifUrl: string) => {
    if (!isConnected || isSending) return;
    try {
      await onSendContent(gifUrl);
    } catch (error) {
      console.error("MessageInput: Error sending GIF:", error);
    }
  };

  return (
    <form
      onSubmit={handleSendMessage}
      className="flex items-center p-5 border-t"
    >
      <div className="flex-1 relative flex items-center space-x-2">
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
          className="flex-1 py-6 text-base rounded-full px-5 shadow-sm border-muted-foreground/20 pr-24"
        />
        <MediaPicker onEmojiClick={onEmojiClick} onGifSelect={handleSendGif} />
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
