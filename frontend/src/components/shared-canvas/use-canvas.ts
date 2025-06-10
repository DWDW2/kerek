import { useState, useCallback } from "react";
import {
  CanvasState,
  CanvasConfig,
  DrawingOptions,
  Point,
  ShapeType,
  CanvasShape,
} from "./types";
import { ShapeFactory } from "./shape-factory";

const initialCanvasState: CanvasState = {
  shapes: [],
  selectedShapeIds: [],
  tool: "select",
  isDrawing: false,
  currentDrawingShape: null,
};

const initialCanvasConfig: CanvasConfig = {
  width: 800,
  height: 600,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  backgroundColor: "#ffffff",
  gridEnabled: false,
  snapToGrid: false,
  gridSize: 20,
};

const initialDrawingOptions: DrawingOptions = {
  fill: "transparent",
  stroke: "#000000",
  strokeWidth: 2,
  fontSize: 16,
  fontFamily: "Arial",
};

export function useCanvas() {
  const [canvasState, setCanvasState] =
    useState<CanvasState>(initialCanvasState);
  const [canvasConfig, setCanvasConfig] =
    useState<CanvasConfig>(initialCanvasConfig);
  const [drawingOptions, setDrawingOptions] = useState<DrawingOptions>(
    initialDrawingOptions
  );

  const addShape = useCallback((shape: CanvasShape) => {
    setCanvasState((prev) => ({
      ...prev,
      shapes: [...prev.shapes, shape],
    }));
  }, []);

  const updateShape = useCallback(
    (shapeId: string, updates: Partial<CanvasShape>) => {
      setCanvasState((prev) => ({
        ...prev,
        shapes: prev.shapes.map((shape) =>
          shape.id === shapeId
            ? { ...shape, ...updates, timestamp: Date.now() }
            : shape
        ),
      }));
    },
    []
  );

  const deleteShape = useCallback((shapeId: string) => {
    setCanvasState((prev) => ({
      ...prev,
      shapes: prev.shapes.filter((shape) => shape.id !== shapeId),
      selectedShapeIds: prev.selectedShapeIds.filter((id) => id !== shapeId),
    }));
  }, []);

  const deleteSelectedShapes = useCallback(() => {
    setCanvasState((prev) => ({
      ...prev,
      shapes: prev.shapes.filter(
        (shape) => !prev.selectedShapeIds.includes(shape.id)
      ),
      selectedShapeIds: [],
    }));
  }, []);

  const selectShape = useCallback((shapeId: string) => {
    setCanvasState((prev) => ({
      ...prev,
      selectedShapeIds: [shapeId],
    }));
  }, []);

  const selectMultipleShapes = useCallback((shapeIds: string[]) => {
    setCanvasState((prev) => ({
      ...prev,
      selectedShapeIds: shapeIds,
    }));
  }, []);

  const clearSelection = useCallback(() => {
    setCanvasState((prev) => ({
      ...prev,
      selectedShapeIds: [],
    }));
  }, []);

  const selectAllShapes = useCallback(() => {
    setCanvasState((prev) => ({
      ...prev,
      selectedShapeIds: prev.shapes.map((shape) => shape.id),
    }));
  }, []);

  const setTool = useCallback((tool: ShapeType | "select" | "pan") => {
    setCanvasState((prev) => ({
      ...prev,
      tool,
      selectedShapeIds: [],
    }));
  }, []);

  const startDrawing = useCallback(
    (startPoint: Point, tool: ShapeType) => {
      if (tool === "text") {
        const newShape = ShapeFactory.createShape(
          tool,
          startPoint,
          startPoint,
          drawingOptions
        );
        addShape(newShape);
        selectShape(newShape.id);
        return newShape;
      } else {
        const newShape = ShapeFactory.createShape(
          tool,
          startPoint,
          startPoint,
          drawingOptions
        );
        setCanvasState((prev) => ({
          ...prev,
          currentDrawingShape: newShape,
          isDrawing: true,
        }));
        return newShape;
      }
    },
    [drawingOptions, addShape, selectShape]
  );

  const updateDrawing = useCallback(
    (currentPoint: Point, originalStartPoint: Point) => {
      setCanvasState((prev) => {
        if (!prev.currentDrawingShape) return prev;

        const updatedShape = ShapeFactory.updateShapeSize(
          prev.currentDrawingShape,
          currentPoint,
          originalStartPoint
        );

        return {
          ...prev,
          currentDrawingShape: updatedShape,
        };
      });
    },
    []
  );

  const finishDrawing = useCallback(() => {
    setCanvasState((prev) => {
      if (!prev.currentDrawingShape) return prev;

      return {
        ...prev,
        shapes: [...prev.shapes, prev.currentDrawingShape],
        selectedShapeIds: [prev.currentDrawingShape.id],
        currentDrawingShape: null,
        isDrawing: false,
      };
    });
  }, []);

  const cancelDrawing = useCallback(() => {
    setCanvasState((prev) => ({
      ...prev,
      currentDrawingShape: null,
      isDrawing: false,
    }));
  }, []);

  const updateCanvasConfig = useCallback((updates: Partial<CanvasConfig>) => {
    setCanvasConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const updateDrawingOptions = useCallback(
    (updates: Partial<DrawingOptions>) => {
      setDrawingOptions((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  const zoomIn = useCallback(() => {
    setCanvasConfig((prev) => ({
      ...prev,
      scale: Math.min(prev.scale * 1.2, 3),
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setCanvasConfig((prev) => ({
      ...prev,
      scale: Math.max(prev.scale / 1.2, 0.1),
    }));
  }, []);

  const resetZoom = useCallback(() => {
    setCanvasConfig((prev) => ({
      ...prev,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    }));
  }, []);

  const clearCanvas = useCallback(() => {
    setCanvasState(initialCanvasState);
  }, []);

  return {
    canvasState,
    canvasConfig,
    drawingOptions,

    addShape,
    updateShape,
    deleteShape,
    deleteSelectedShapes,

    selectShape,
    selectMultipleShapes,
    clearSelection,
    selectAllShapes,

    setTool,

    startDrawing,
    updateDrawing,
    finishDrawing,
    cancelDrawing,

    updateCanvasConfig,
    updateDrawingOptions,

    zoomIn,
    zoomOut,
    resetZoom,

    clearCanvas,
  };
}
