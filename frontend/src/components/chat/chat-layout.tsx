"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ReactNode } from "react";

interface ChatLayoutProps {
  header: ReactNode;
  children: ReactNode;
  messageInput: ReactNode;
  wsError?: string | null;
}

export function ChatLayout({
  header,
  children,
  messageInput,
  wsError,
}: ChatLayoutProps) {
  return (
    <Card className="h-full flex flex-col border-none shadow-none rounded-none p-0 m-0">
      <CardHeader className="border-b px-6 py-6 bg-gradient-to-r from-primary/10 to-secondary/10 flex items-center gap-2 h-[61px]">
        {header}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 justify-between">
        {children}
        {messageInput}
        {wsError && (
          <p className="text-sm text-red-500 mt-2 text-center">{wsError}</p>
        )}
      </CardContent>
    </Card>
  );
}
