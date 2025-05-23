"use client";
import { cache, useEffect, useState } from "react";
import Image from "next/image";
import { GiphyGif, GiphyTrendingResponse } from "@/types/giphy";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Loader2, Search } from "lucide-react";

interface GifPickerProps {
  onGifSelect: (gifUrl: string) => void;
}

async function fetchGifs(query?: string) {
  const endpoint = query
    ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(
        query
      )}&limit=24&rating=g`
    : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=24&rating=g`;

  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`Giphy API Error: ${response.statusText}`);
    }
    const data: GiphyTrendingResponse = await response.json();
    return data.data;
  } catch (err) {
    console.error("Failed to fetch Gifs:", err);
    throw err instanceof Error ? err : new Error("Failed to load GIFs");
  }
}

const cacheFetchGifs = cache(fetchGifs);

const GIPHY_API_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY || "API_KEY";

export function GifPicker({ onGifSelect }: GifPickerProps) {
  const [gifs, setGifs] = useState<GiphyGif[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  console.log();
  useEffect(() => {
    if (isPopoverOpen || !isDesktop) {
      cacheFetchGifs().then((gifs) => setGifs(gifs));
    }
  }, [isPopoverOpen, isDesktop]);

  const handleSelectGif = (gif: GiphyGif) => {
    onGifSelect(gif.images.fixed_height.url);
    setIsPopoverOpen(false);
  };

  const gifGrid = (
    <div className="grid grid-cols-3 gap-2">
      {gifs.map((gif) => (
        <button
          key={gif.id}
          onClick={() => handleSelectGif(gif)}
          className="aspect-square relative overflow-hidden rounded-md hover:ring-2 hover:ring-primary focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <Image
            src={gif.images.fixed_width_small.url}
            alt={gif.title || "GIF"}
            width={parseInt(gif.images.fixed_width_small.width)}
            height={parseInt(gif.images.fixed_width_small.height)}
            className="object-cover w-full h-full"
            unoptimized
          />
        </button>
      ))}
    </div>
  );

  return (
    <>
      <div className="p-4 border-b">
        <div className="relative">
          <Input
            type="text"
            placeholder="Search GIPHY"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (searchTerm.trim()) {
                  cacheFetchGifs(searchTerm);
                } else {
                  cacheFetchGifs();
                }
              }
            }}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
            disabled={isLoading}
            onClick={() => {
              if (searchTerm.trim()) {
                cacheFetchGifs(searchTerm);
              } else {
                cacheFetchGifs();
              }
            }}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <ScrollArea className="h-[300px] p-4">
        {isLoading && (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {error && <p className="text-red-500 text-center">{error}</p>}
        {!isLoading && !error && gifs.length === 0 && (
          <p className="text-muted-foreground text-center">No GIFs found.</p>
        )}
        {!isLoading && !error && gifs.length > 0 && gifGrid}
      </ScrollArea>
    </>
  );
}
