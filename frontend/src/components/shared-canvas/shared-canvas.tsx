"use client";
import React, { useRef, useCallback, useEffect, useState } from "react";
import { Stage, Layer } from "react-konva";
import Konva from "konva";
import {
  CanvasState,
  CanvasConfig,
  DrawingOptions,
  Point,
  ShapeType,
  TextShape,
} from "./types";
import { ShapeFactory } from "./shape-factory";
import CanvasToolbar from "./canvas-toolbar";
import CanvasShapeComponent, { TriangleShape } from "./canvas-shape";
import { useAuth } from "@/context/auth-context";

interface SharedCanvasProps {
  className?: string;
}

export default function SharedCanvas({ className = "" }: SharedCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>("");
  const [textPosition, setTextPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [canvasState, setCanvasState] = useState<CanvasState>({
    shapes: [],
    selectedShapeIds: [],
    tool: "select",
    isDrawing: false,
    currentDrawingShape: null,
  });

  const [canvasConfig, setCanvasConfig] = useState<CanvasConfig>({
    width: 800,
    height: 600,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    backgroundColor: "#ffffff",
    gridEnabled: false,
    snapToGrid: false,
    gridSize: 20,
  });

  const [drawingOptions, setDrawingOptions] = useState<DrawingOptions>({
    fill: "transparent",
    stroke: "#000000",
    strokeWidth: 2,
    fontSize: 16,
    fontFamily: "Arial",
  });

  const { token } = useAuth();

  const ws = new WebSocket(
    `${process.env.NEXT_PUBLIC_WS_URL}/ws/canvas?token=${token}`
  );

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "update") {
      setCanvasState((prev) => ({
        ...prev,
        shapes: data.shapes,
      }));
    }
  };

  useEffect(() => {
    ws.send(
      JSON.stringify({
        type: "update",
        shapes: canvasState.shapes,
      })
    );
  }, [canvasState.shapes]);

  const updateCanvasSize = useCallback(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();

      setCanvasConfig((prev) => ({
        ...prev,
        width: Math.min(rect.width, window.innerWidth - 40),
        height: Math.max(rect.height, 400),
      }));
    }
  }, []);

  useEffect(() => {
    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, [updateCanvasSize]);

  const getPointerPosition = useCallback(
    (e: any): Point => {
      const stage = stageRef.current;
      if (!stage) return { x: 0, y: 0 };

      const pos = stage.getPointerPosition();
      if (!pos) return { x: 0, y: 0 };

      return {
        x: (pos.x - canvasConfig.offsetX) / canvasConfig.scale,
        y: (pos.y - canvasConfig.offsetY) / canvasConfig.scale,
      };
    },
    [canvasConfig.offsetX, canvasConfig.offsetY, canvasConfig.scale]
  );

  const handleMouseDown = useCallback(
    (e: any) => {
      if (e.target !== e.target.getStage()) return;

      const pos = getPointerPosition(e);

      if (canvasState.tool === "select") {
        setCanvasState((prev) => ({ ...prev, selectedShapeIds: [] }));
      } else if (canvasState.tool === "pan") {
        setIsDrawing(true);
        setStartPoint(pos);
      } else if (
        ["rectangle", "circle", "triangle", "arrow", "line", "text"].includes(
          canvasState.tool
        )
      ) {
        setIsDrawing(true);
        setStartPoint(pos);

        if (canvasState.tool === "text") {
          const newShape = ShapeFactory.createShape(
            canvasState.tool,
            pos,
            pos,
            drawingOptions
          );

          setCanvasState((prev) => ({
            ...prev,
            shapes: [...prev.shapes, newShape],
            selectedShapeIds: [newShape.id],
          }));

          // Start editing the new text shape
          startTextEditing(newShape.id, newShape as TextShape, pos);
          setIsDrawing(false);
          setStartPoint(null);
        }
      }
    },
    [canvasState.tool, getPointerPosition, drawingOptions]
  );

  const handleMouseMove = useCallback(
    (e: any) => {
      if (!isDrawing || !startPoint) return;

      const pos = getPointerPosition(e);

      if (canvasState.tool === "pan") {
        const deltaX = pos.x - startPoint.x;
        const deltaY = pos.y - startPoint.y;

        setCanvasConfig((prev) => ({
          ...prev,
          offsetX: prev.offsetX + deltaX * canvasConfig.scale,
          offsetY: prev.offsetY + deltaY * canvasConfig.scale,
        }));
      } else if (canvasState.tool !== "select" && canvasState.tool !== "text") {
        if (canvasState.currentDrawingShape) {
          const updatedShape = ShapeFactory.updateShapeSize(
            canvasState.currentDrawingShape,
            pos,
            startPoint
          );

          setCanvasState((prev) => ({
            ...prev,
            currentDrawingShape: updatedShape,
          }));
        } else {
          const newShape = ShapeFactory.createShape(
            canvasState.tool as ShapeType,
            startPoint,
            pos,
            drawingOptions
          );

          setCanvasState((prev) => ({
            ...prev,
            currentDrawingShape: newShape,
          }));
        }
      }
    },
    [
      isDrawing,
      startPoint,
      canvasState.tool,
      canvasState.currentDrawingShape,
      getPointerPosition,
      drawingOptions,
      canvasConfig.scale,
    ]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawing) return;

    if (canvasState.currentDrawingShape && canvasState.tool !== "text") {
      setCanvasState((prev) => ({
        ...prev,
        shapes: [...prev.shapes, canvasState.currentDrawingShape!],
        currentDrawingShape: null,
        selectedShapeIds: [canvasState.currentDrawingShape!.id],
      }));
    }

    setIsDrawing(false);
    setStartPoint(null);
  }, [isDrawing, canvasState.currentDrawingShape, canvasState.tool]);

  const handleShapeSelect = useCallback((shapeId: string) => {
    setCanvasState((prev) => ({
      ...prev,
      selectedShapeIds: [shapeId],
    }));
  }, []);

  const handleShapeDragEnd = useCallback((shapeId: string, newAttrs: any) => {
    setCanvasState((prev) => ({
      ...prev,
      shapes: prev.shapes.map((shape) =>
        shape.id === shapeId
          ? { ...shape, x: newAttrs.x, y: newAttrs.y, timestamp: Date.now() }
          : shape
      ),
    }));
  }, []);

  const startTextEditing = useCallback(
    (shapeId: string, textShape: TextShape, pos?: Point) => {
      const stage = stageRef.current;
      if (!stage) return;

      const shape = pos ? { x: pos.x, y: pos.y } : textShape;
      const stageBox = stage.container().getBoundingClientRect();

      const textX =
        stageBox.left + (shape.x + canvasConfig.offsetX) * canvasConfig.scale;
      const textY =
        stageBox.top + (shape.y + canvasConfig.offsetY) * canvasConfig.scale;

      setEditingTextId(shapeId);
      setEditingText(textShape.text || "");
      setTextPosition({ x: textX, y: textY });

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.select();
        }
      }, 0);
    },
    [canvasConfig.offsetX, canvasConfig.offsetY, canvasConfig.scale]
  );

  const finishTextEditing = useCallback(() => {
    if (!editingTextId) return;

    setCanvasState((prev) => ({
      ...prev,
      shapes: prev.shapes.map((shape) =>
        shape.id === editingTextId && shape.type === "text"
          ? { ...shape, text: editingText || "Text", timestamp: Date.now() }
          : shape
      ),
    }));

    setEditingTextId(null);
    setEditingText("");
    setTextPosition(null);
  }, [editingTextId, editingText]);

  const handleTextDoubleClick = useCallback(
    (shapeId: string) => {
      const textShape = canvasState.shapes.find(
        (shape) => shape.id === shapeId
      ) as TextShape;
      if (!textShape) return;

      startTextEditing(shapeId, textShape);
    },
    [canvasState.shapes, startTextEditing]
  );

  const handleToolChange = useCallback((tool: ShapeType | "select" | "pan") => {
    setCanvasState((prev) => ({
      ...prev,
      tool,
      selectedShapeIds: [],
    }));
    setEditingTextId(null);
    setEditingText("");
    setTextPosition(null);
  }, []);

  const handleDrawingOptionsChange = useCallback(
    (options: Partial<DrawingOptions>) => {
      setDrawingOptions((prev) => ({ ...prev, ...options }));
    },
    []
  );

  const handleWheel = useCallback(
    (e: any) => {
      e.evt.preventDefault();

      const scaleBy = 1.05;
      const stage = stageRef.current;
      if (!stage) return;

      const oldScale = canvasConfig.scale;
      const pointer = stage.getPointerPosition();

      const mousePointTo = {
        x: (pointer!.x - canvasConfig.offsetX) / oldScale,
        y: (pointer!.y - canvasConfig.offsetY) / oldScale,
      };

      const newScale =
        e.evt.deltaY > 0 ? oldScale * scaleBy : oldScale / scaleBy;
      const clampedScale = Math.max(0.1, Math.min(3, newScale));

      setCanvasConfig((prev) => ({
        ...prev,
        scale: clampedScale,
        offsetX: pointer!.x - mousePointTo.x * clampedScale,
        offsetY: pointer!.y - mousePointTo.y * clampedScale,
      }));
    },
    [canvasConfig.scale, canvasConfig.offsetX, canvasConfig.offsetY]
  );

  const handleTextareaKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        finishTextEditing();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setEditingTextId(null);
        setEditingText("");
        setTextPosition(null);
      }
    },
    [finishTextEditing]
  );

  const handleTextareaBlur = useCallback(() => {
    finishTextEditing();
  }, [finishTextEditing]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (editingTextId) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        setCanvasState((prev) => ({
          ...prev,
          shapes: prev.shapes.filter(
            (shape) => !prev.selectedShapeIds.includes(shape.id)
          ),
          selectedShapeIds: [],
        }));
      }

      if (e.key === "Escape") {
        setCanvasState((prev) => ({
          ...prev,
          selectedShapeIds: [],
          currentDrawingShape: null,
        }));
        setIsDrawing(false);
        setStartPoint(null);
        setEditingTextId(null);
        setEditingText("");
        setTextPosition(null);
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        setCanvasState((prev) => ({
          ...prev,
          selectedShapeIds: prev.shapes.map((shape) => shape.id),
        }));
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingTextId]);

  const renderShapes = () => {
    const allShapes = [...canvasState.shapes];
    if (canvasState.currentDrawingShape) {
      allShapes.push(canvasState.currentDrawingShape);
    }

    return allShapes.map((shape) => {
      const isSelected = canvasState.selectedShapeIds.includes(shape.id);
      const isEditing = editingTextId === shape.id;

      if (shape.type === "text" && isEditing) {
        return null;
      }

      if (shape.type === "triangle") {
        return (
          <TriangleShape
            key={shape.id}
            shape={shape}
            isSelected={isSelected}
            onSelect={handleShapeSelect}
            onDragStart={() => {}}
            onDragEnd={handleShapeDragEnd}
          />
        );
      }

      return (
        <CanvasShapeComponent
          key={shape.id}
          shape={shape}
          isSelected={isSelected}
          onSelect={handleShapeSelect}
          onDragStart={() => {}}
          onDragEnd={handleShapeDragEnd}
          onDoubleClick={
            shape.type === "text" ? handleTextDoubleClick : undefined
          }
        />
      );
    });
  };

  return (
    <div className={`flex flex-col h-full bg-gray-50 ${className}`}>
      <div className="flex-shrink-0 p-4 bg-white border-b border-gray-200">
        <CanvasToolbar
          currentTool={canvasState.tool}
          onToolChange={handleToolChange}
          drawingOptions={drawingOptions}
          onDrawingOptionsChange={handleDrawingOptionsChange}
          className="mx-auto max-w-4xl"
        />
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative"
        style={{
          cursor:
            canvasState.tool === "pan"
              ? "grab"
              : canvasState.tool === "select"
              ? "default"
              : "crosshair",
        }}
      >
        <Stage
          ref={stageRef}
          width={canvasConfig.width}
          height={canvasConfig.height}
          scaleX={canvasConfig.scale}
          scaleY={canvasConfig.scale}
          x={canvasConfig.offsetX}
          y={canvasConfig.offsetY}
          onMouseDown={handleMouseDown}
          onMousemove={handleMouseMove}
          onMouseup={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
          onWheel={handleWheel}
        >
          <Layer>{renderShapes()}</Layer>
        </Stage>

        {editingTextId && textPosition && (
          <textarea
            ref={textareaRef}
            value={editingText}
            onChange={(e) => setEditingText(e.target.value)}
            onKeyDown={handleTextareaKeyDown}
            onBlur={handleTextareaBlur}
            style={{
              position: "absolute",
              left: textPosition.x,
              top: textPosition.y,
              fontSize: `${drawingOptions.fontSize * canvasConfig.scale}px`,
              fontFamily: drawingOptions.fontFamily,
              border: "2px solid #0088ff",
              borderRadius: "4px",
              background: "white",
              padding: "4px",
              minWidth: "100px",
              minHeight: "30px",
              resize: "none",
              outline: "none",
              zIndex: 1000,
            }}
            autoFocus
          />
        )}

        <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 px-3 py-1 rounded text-sm text-gray-600">
          Shapes: {canvasState.shapes.length} | Selected:{" "}
          {canvasState.selectedShapeIds.length} | Zoom:{" "}
          {Math.round(canvasConfig.scale * 100)}%
        </div>
      </div>
    </div>
  );
}
