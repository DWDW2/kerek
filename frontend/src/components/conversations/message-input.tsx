"use client";

import { useState } from "react";
import { SendHorizontal, Smile, Code2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import  { EmojiClickData } from "emoji-picker-react";
import MediaPicker from "./media-picker";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";

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
  const router = useRouter();
  const params = useParams();

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

  const handleOpenCodeEditor = () => {
    const conversationId = params.id;
    router.push(`/dashboard/conversations/${conversationId}/code-editor`);
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
        <div className="flex items-center w-[8%] gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleOpenCodeEditor}
            className="shrink-0 rounded-full h-10 w-10"
          >
            <Code2 className="h-5 w-5" />
          </Button>
          <MediaPicker
            onEmojiClick={onEmojiClick}
            onGifSelect={handleSendGif}
          />
        </div>
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
