"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import "@excalidraw/excalidraw/index.css";
const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((mod) => mod.Excalidraw),
  { ssr: false }
);

export default function Chat() {
  const [showCanvas, setShowCanvas] = useState(false);

  const toggleCanvas = () => {
    setShowCanvas(!showCanvas);
  };

  return (
    <div className="flex flex-col h-screen max-w-6xl mx-auto p-4 box-border">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Chat</h1>
        <button
          className="px-4 py-2 bg-blue-500 hover:bg-blue-700 text-white rounded font-medium"
          onClick={toggleCanvas}
        >
          {showCanvas ? "Hide Canvas" : "Show Canvas"}
        </button>
      </div>

      <div className="flex flex-1 gap-4">
        <div className="flex-1 flex flex-col border rounded-lg overflow-hidden">
          <div className="flex-1 p-4 overflow-y-auto bg-gray-100">
            <div className="bg-white p-3 rounded-lg shadow-sm mb-3">
              <p>Hello! Need help with something?</p>
            </div>
          </div>

          <div className="flex p-3 border-t bg-white">
            <input
              type="text"
              placeholder="Type your message..."
              className="flex-1 p-2 border rounded-md mr-2 focus:outline-none focus:ring focus:border-blue-300"
            />
            <button className="px-4 py-2 bg-blue-500 hover:bg-blue-700 text-white rounded font-medium">
              Send
            </button>
          </div>
        </div>

        {showCanvas && (
          <div className="w-[500px] h-[500px]">
            <Excalidraw />
          </div>
        )}
      </div>
    </div>
  );
}
