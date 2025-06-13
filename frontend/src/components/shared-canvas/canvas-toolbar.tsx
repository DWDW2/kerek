"use client";

import React, { useEffect, useState } from "react";
import {
  Square,
  Circle,
  Triangle,
  ArrowRight,
  Minus,
  Type,
  MousePointer,
  Move,
  Palette,
  Settings,
} from "lucide-react";
import { ShapeType, DrawingOptions } from "./types";

interface CanvasToolbarProps {
  tool: ShapeType | "select" | "pan";
  onToolChange: (tool: ShapeType | "select" | "pan") => void;
  drawingOptions: DrawingOptions;
  onDrawingOptionsChange: (options: Partial<DrawingOptions>) => void;
  canvasConfig: any;
  onCanvasConfigChange: (config: any) => void;
  onClearCanvas: () => void;
  connectionStatus: {
    isConnected: boolean;
    userCount: number;
    currentUserColor: string;
  };
  className?: string;
}

const tools = [
  {
    type: "select" as const,
    name: "Select",
    icon: MousePointer,
    shortcut: "V",
  },
  { type: "pan" as const, name: "Pan", icon: Move, shortcut: "H" },
  {
    type: "rectangle" as const,
    name: "Rectangle",
    icon: Square,
    shortcut: "R",
  },
  { type: "circle" as const, name: "Circle", icon: Circle, shortcut: "C" },
  {
    type: "triangle" as const,
    name: "Triangle",
    icon: Triangle,
    shortcut: "T",
  },
  { type: "arrow" as const, name: "Arrow", icon: ArrowRight, shortcut: "A" },
  { type: "line" as const, name: "Line", icon: Minus, shortcut: "L" },
  { type: "text" as const, name: "Text", icon: Type, shortcut: "X" },
];

const colors = [
  "#000000",
  "#ffffff",
  "#ff0000",
  "#00ff00",
  "#0000ff",
  "#ffff00",
  "#ff00ff",
  "#00ffff",
  "#ffa500",
  "#800080",
];

export default function CanvasToolbar({
  tool,
  onToolChange,
  drawingOptions,
  onDrawingOptionsChange,
  canvasConfig,
  onCanvasConfigChange,
  onClearCanvas,
  connectionStatus,
  className = "",
}: CanvasToolbarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [colorMode, setColorMode] = useState<"fill" | "stroke">("stroke");

  // useEffect(() => {
  //   function handleKeyPress(event: KeyboardEvent) {
  //     if (event.ctrlKey || event.metaKey || event.altKey) return;

  //     const tool = tools.find(
  //       (t) => t.shortcut.toLowerCase() === event.key.toLowerCase()
  //     );
  //     if (tool) {
  //       event.preventDefault();
  //       onToolChange(tool.type);
  //     }
  //   }

  //   window.addEventListener("keydown", handleKeyPress);
  //   return () => window.removeEventListener("keydown", handleKeyPress);
  // }, [onToolChange]);

  const handleColorChange = (color: string) => {
    if (colorMode === "fill") {
      onDrawingOptionsChange({ fill: color });
    } else {
      onDrawingOptionsChange({ stroke: color });
    }
    setShowColorPicker(false);
  };

  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg shadow-lg p-2 ${className}`}
    >
      <div className="flex flex-wrap gap-1 mb-2">
        {tools.map((toolItem) => {
          const Icon = toolItem.icon;
          const isActive = tool === toolItem.type;

          return (
            <button
              key={toolItem.type}
              onClick={() => onToolChange(toolItem.type)}
              className={`
                flex items-center justify-center w-10 h-10 rounded-md transition-colors
                hover:bg-gray-100 active:bg-gray-200
                ${
                  isActive
                    ? "bg-blue-100 text-blue-600 border-2 border-blue-300"
                    : "text-gray-600"
                }
                focus:outline-none focus:ring-2 focus:ring-blue-300
              `}
              title={`${toolItem.name} (${toolItem.shortcut})`}
              aria-label={toolItem.name}
            >
              <Icon size={18} />
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
        <div className="relative">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
            title="Colors"
          >
            <Palette size={16} />
            <div className="flex gap-1">
              <div
                className="w-4 h-4 rounded border border-gray-300"
                style={{ backgroundColor: drawingOptions.stroke }}
                title="Stroke color"
              />
              <div
                className="w-4 h-4 rounded border border-gray-300"
                style={{ backgroundColor: drawingOptions.fill }}
                title="Fill color"
              />
            </div>
          </button>

          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50">
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => setColorMode("stroke")}
                  className={`px-2 py-1 text-xs rounded ${
                    colorMode === "stroke"
                      ? "bg-blue-100 text-blue-600"
                      : "bg-gray-100"
                  }`}
                >
                  Stroke
                </button>
                <button
                  onClick={() => setColorMode("fill")}
                  className={`px-2 py-1 text-xs rounded ${
                    colorMode === "fill"
                      ? "bg-blue-100 text-blue-600"
                      : "bg-gray-100"
                  }`}
                >
                  Fill
                </button>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleColorChange(color)}
                    className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-gray-100 transition-colors"
            title="Settings"
          >
            <Settings size={16} />
          </button>

          {showSettings && (
            <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50 min-w-48">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Stroke Width
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={drawingOptions.strokeWidth}
                    onChange={(e) =>
                      onDrawingOptionsChange({
                        strokeWidth: Number(e.target.value),
                      })
                    }
                    className="w-full"
                  />
                  <span className="text-xs text-gray-500">
                    {drawingOptions.strokeWidth}px
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Font Size
                  </label>
                  <input
                    type="range"
                    min="8"
                    max="72"
                    value={drawingOptions.fontSize}
                    onChange={(e) =>
                      onDrawingOptionsChange({
                        fontSize: Number(e.target.value),
                      })
                    }
                    className="w-full"
                  />
                  <span className="text-xs text-gray-500">
                    {drawingOptions.fontSize}px
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Font Family
                  </label>
                  <select
                    value={drawingOptions.fontFamily}
                    onChange={(e) =>
                      onDrawingOptionsChange({ fontFamily: e.target.value })
                    }
                    className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="Arial">Arial</option>
                    <option value="Helvetica">Helvetica</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Verdana">Verdana</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <div
                className={`w-2 h-2 rounded-full ${
                  connectionStatus.isConnected ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span>
                {connectionStatus.isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
            <span>•</span>
            <span>
              {connectionStatus.userCount} user
              {connectionStatus.userCount !== 1 ? "s" : ""}
            </span>
            {connectionStatus.currentUserColor && (
              <>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <div
                    className="w-3 h-3 rounded-full border border-gray-300"
                    style={{
                      backgroundColor: connectionStatus.currentUserColor,
                    }}
                    title="Your color"
                  />
                  <span>You</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {(showColorPicker || showSettings) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowColorPicker(false);
            setShowSettings(false);
          }}
        />
      )}
    </div>
  );
}
