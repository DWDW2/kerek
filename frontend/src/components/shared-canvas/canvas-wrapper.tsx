"use client";
import React from "react";
import dynamic from "next/dynamic";

const SharedCanvas = dynamic(() => import("./shared-canvas"), {
  ssr: false,
});

interface CanvasWrapperProps {
  conversationId: string;
}

export default function CanvasWrapper({ conversationId }: CanvasWrapperProps) {
  return <SharedCanvas conversationId={conversationId} />;
}
