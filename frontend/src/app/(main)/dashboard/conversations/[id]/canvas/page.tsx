import React from "react";
import CanvasWrapper from "@/components/shared-canvas/canvas-wrapper";

interface CanvasPageProps {
  params: {
    id: string;
  };
}

export default function Canvas({ params }: CanvasPageProps) {
  return <CanvasWrapper conversationId={params.id} />;
}
