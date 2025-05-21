import React, { lazy, Suspense, useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Smile } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import type { EmojiClickData } from "emoji-picker-react";

const EmojiPicker = lazy(() => import("emoji-picker-react"));
const GifPicker = lazy(() =>
  import("./gif-picker").then((mod) => ({ default: mod.GifPicker }))
);

type Props = {
  onEmojiClick: (emoji: EmojiClickData) => void;
  onGifSelect: (gif: string) => void;
};

export default function MediaPicker({ onEmojiClick, onGifSelect }: Props) {
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [width, setWidth] = useState(0);
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  useEffect(() => {
    setWidth(window.innerWidth);
  }, []);

  return (
    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
      <Popover
        open={showMediaPicker}
        onOpenChange={(open) => {
          setShowMediaPicker(open);
          if (!open) {
            setActiveTab(null);
          } else {
            setActiveTab("emoji");
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-muted"
          >
            <Smile className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-full p-0"
          align={width > 768 ? "end" : "center"}
        >
          <Tabs value={activeTab || "emoji"} onValueChange={handleTabChange}>
            <TabsList className="w-full">
              <TabsTrigger value="emoji" className="flex-1">
                Emoji
              </TabsTrigger>
              <TabsTrigger value="gif" className="flex-1">
                Gif
              </TabsTrigger>
            </TabsList>

            <TabsContent value="emoji">
              <Suspense
                fallback={
                  <div className="h-[350px] flex items-center justify-center">
                    <Spinner />
                  </div>
                }
              >
                {activeTab === "emoji" && (
                  <EmojiPicker
                    onEmojiClick={onEmojiClick}
                    width="100%"
                    height={350}
                    lazyLoadEmojis={true}
                  />
                )}
              </Suspense>
            </TabsContent>

            <TabsContent value="gif">
              <Suspense
                fallback={
                  <div className="h-[350px] flex items-center justify-center">
                    <Spinner />
                  </div>
                }
              >
                {activeTab === "gif" && <GifPicker onGifSelect={onGifSelect} />}
              </Suspense>
            </TabsContent>
          </Tabs>
        </PopoverContent>
      </Popover>
    </div>
  );
}
