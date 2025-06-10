"use client";
import React from "react";
import dynamic from "next/dynamic";

const SharedCanvas = dynamic(() => import("./shared-canvas"), {
  ssr: false,
});

type Props = {};

export default function CanvasWrapper({}: Props) {
  return <SharedCanvas />;
}
