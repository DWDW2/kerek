"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import JSConfetti from "js-confetti";
import { useEffect, useRef } from "react";
import { Message } from "@/types/conversation";
import { ConversationCustomization } from "@/types/conversation";
import Image from "next/image";

interface MessageItemProps {
  message: Message;
  customization?: ConversationCustomization;
}

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  customization,
}) => {
  const { user } = useAuth();
  const jsConfettiRef = useRef<JSConfetti | null>(null);

  useEffect(() => {
    jsConfettiRef.current = new JSConfetti();

    return () => {
      jsConfettiRef.current = null;
    };
  }, []);

  const containsEmoji = (str: string) => {
    const emojiRegex = /[\p{Emoji}]/u;
    return emojiRegex.test(str);
  };

  const handleEmojiClick = (emoji: string) => {
    if (jsConfettiRef.current) {
      jsConfettiRef.current.addConfetti({
        emojis: [emoji],
        emojiSize: 100,
        confettiNumber: 30,
      });
    }
  };

  const isSingleEmoji = (content: string) => {
    const singleEmojiRegex =
      /^(?:\p{Emoji}\p{Emoji_Modifier}*|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}+)$/u;
    return singleEmojiRegex.test(content.trim());
  };

  const isGifUrl = (content: string) => {
    return (
      content.startsWith("https://i.giphy.com/") && content.endsWith(".gif")
    );
  };

  const renderMessageContent = (content: string) => {
    if (isGifUrl(content)) {
      return (
        <div className="relative w-48 h-48 md:w-64 md:h-64 overflow-hidden rounded-lg">
          <Image
            src={content}
            alt="GIF"
            layout="fill"
            objectFit="contain"
            unoptimized
            className="rounded-lg"
          />
        </div>
      );
    }

    if (!containsEmoji(content)) {
      return <p className="text-base leading-relaxed">{content}</p>;
    }

    if (isSingleEmoji(content.trim())) {
      return (
        <p className="text-base leading-relaxed">
          <span
            onClick={() => handleEmojiClick(content.trim())}
            className="cursor-pointer hover:scale-150 inline-block transition-transform text-4xl"
          >
            {content.trim()}
          </span>
        </p>
      );
    }

    const parts = [];
    let currentText = "";

    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      if (containsEmoji(char)) {
        if (currentText) {
          parts.push({ type: "text", content: currentText });
          currentText = "";
        }
        parts.push({ type: "emoji", content: char });
      } else {
        currentText += char;
      }
    }

    if (currentText) {
      parts.push({ type: "text", content: currentText });
    }

    return (
      <p className="text-base leading-relaxed">
        {parts.map((part, index) =>
          part.type === "emoji" ? (
            <span
              key={index}
              onClick={() => handleEmojiClick(part.content)}
              className="cursor-pointer hover:scale-150 inline-block transition-transform"
              style={{ fontSize: "1.5em" }}
            >
              {part.content}
            </span>
          ) : (
            <span key={index}>{part.content}</span>
          )
        )}
      </p>
    );
  };

  const isOwnMessage = message.sender_id === user?.id;

  // Get colors from customization or use defaults
  const backgroundColor = isOwnMessage
    ? customization?.primary_message_color || "hsl(var(--primary))"
    : customization?.secondary_message_color || "hsl(var(--muted))";

  const textColor = isOwnMessage
    ? customization?.text_color_primary || "hsl(var(--primary-foreground))"
    : customization?.text_color_secondary || "hsl(var(--foreground))";

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
          isOwnMessage ? "rounded-tr-none" : "rounded-tl-none"
        )}
        style={{
          backgroundColor,
          color: textColor,
        }}
      >
        {renderMessageContent(message.content)}
        <p className="text-xs mt-2 opacity-70 text-right">
          {new Date(message.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </motion.div>
  );
};

export default MessageItem;
