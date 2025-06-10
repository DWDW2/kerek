import { v4 as uuidv4 } from "uuid";
import {
  CanvasShape,
  RectangleShape,
  CircleShape,
  TriangleShape,
  ArrowShape,
  LineShape,
  TextShape,
  Point,
  DrawingOptions,
  ShapeType,
} from "./types";

export class ShapeFactory {
  private static defaultOptions: DrawingOptions = {
    fill: "#ffffff",
    stroke: "#000000",
    strokeWidth: 2,
    fontSize: 16,
    fontFamily: "Arial",
  };

  static createShape(
    type: ShapeType,
    startPoint: Point,
    endPoint: Point,
    options: Partial<DrawingOptions> = {}
  ): CanvasShape {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const baseShape = {
      id: uuidv4(),
      x: Math.min(startPoint.x, endPoint.x),
      y: Math.min(startPoint.y, endPoint.y),
      fill: mergedOptions.fill,
      stroke: mergedOptions.stroke,
      strokeWidth: mergedOptions.strokeWidth,
      opacity: 1,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      visible: true,
      draggable: true,
      timestamp: Date.now(),
    };

    switch (type) {
      case "rectangle":
        return this.createRectangle(startPoint, endPoint, baseShape);
      case "circle":
        return this.createCircle(startPoint, endPoint, baseShape);
      case "triangle":
        return this.createTriangle(startPoint, endPoint, baseShape);
      case "arrow":
        return this.createArrow(startPoint, endPoint, baseShape);
      case "line":
        return this.createLine(startPoint, endPoint, baseShape);
      case "text":
        return this.createText(startPoint, mergedOptions, baseShape);
      default:
        throw new Error(`Unknown shape type: ${type}`);
    }
  }

  private static createRectangle(
    startPoint: Point,
    endPoint: Point,
    baseShape: any
  ): RectangleShape {
    const width = Math.abs(endPoint.x - startPoint.x);
    const height = Math.abs(endPoint.y - startPoint.y);

    return {
      ...baseShape,
      type: "rectangle",
      width: Math.max(width, 10), // Minimum size
      height: Math.max(height, 10),
      cornerRadius: 0,
    };
  }

  private static createCircle(
    startPoint: Point,
    endPoint: Point,
    baseShape: any
  ): CircleShape {
    const radius =
      Math.max(
        Math.abs(endPoint.x - startPoint.x),
        Math.abs(endPoint.y - startPoint.y)
      ) / 2;

    return {
      ...baseShape,
      type: "circle",
      x: startPoint.x + radius,
      y: startPoint.y + radius,
      radius: Math.max(radius, 5), // Minimum radius
    };
  }

  private static createTriangle(
    startPoint: Point,
    endPoint: Point,
    baseShape: any
  ): TriangleShape {
    const width = endPoint.x - startPoint.x;
    const height = endPoint.y - startPoint.y;

    // Create triangle points (equilateral-ish triangle)
    const points = [
      width / 2,
      0, // Top point
      width,
      height, // Bottom right
      0,
      height, // Bottom left
    ];

    return {
      ...baseShape,
      type: "triangle",
      points,
    };
  }

  private static createArrow(
    startPoint: Point,
    endPoint: Point,
    baseShape: any
  ): ArrowShape {
    const points = [startPoint.x, startPoint.y, endPoint.x, endPoint.y];

    return {
      ...baseShape,
      type: "arrow",
      x: 0,
      y: 0,
      points,
      pointerLength: 15,
      pointerWidth: 10,
    };
  }

  private static createLine(
    startPoint: Point,
    endPoint: Point,
    baseShape: any
  ): LineShape {
    const points = [startPoint.x, startPoint.y, endPoint.x, endPoint.y];

    return {
      ...baseShape,
      type: "line",
      x: 0,
      y: 0,
      points,
    };
  }

  private static createText(
    startPoint: Point,
    options: DrawingOptions,
    baseShape: any
  ): TextShape {
    return {
      ...baseShape,
      type: "text",
      x: startPoint.x,
      y: startPoint.y,
      text: "Double click to edit",
      fontSize: options.fontSize,
      fontFamily: options.fontFamily,
      fontStyle: "normal",
      textDecoration: "",
      align: "left",
      verticalAlign: "top",
      width: 200,
      height: options.fontSize * 1.5,
    };
  }

  static updateShapeSize(
    shape: CanvasShape,
    newEndPoint: Point,
    originalStartPoint: Point
  ): CanvasShape {
    const updatedShape = { ...shape };

    switch (shape.type) {
      case "rectangle":
        const rectShape = updatedShape as RectangleShape;
        rectShape.width = Math.abs(newEndPoint.x - originalStartPoint.x);
        rectShape.height = Math.abs(newEndPoint.y - originalStartPoint.y);
        rectShape.x = Math.min(originalStartPoint.x, newEndPoint.x);
        rectShape.y = Math.min(originalStartPoint.y, newEndPoint.y);
        break;

      case "circle":
        const circleShape = updatedShape as CircleShape;
        const radius =
          Math.max(
            Math.abs(newEndPoint.x - originalStartPoint.x),
            Math.abs(newEndPoint.y - originalStartPoint.y)
          ) / 2;
        circleShape.radius = Math.max(radius, 5);
        circleShape.x = originalStartPoint.x + radius;
        circleShape.y = originalStartPoint.y + radius;
        break;

      case "triangle":
        const triangleShape = updatedShape as TriangleShape;
        const width = newEndPoint.x - originalStartPoint.x;
        const height = newEndPoint.y - originalStartPoint.y;
        triangleShape.points = [width / 2, 0, width, height, 0, height];
        triangleShape.x = Math.min(originalStartPoint.x, newEndPoint.x);
        triangleShape.y = Math.min(originalStartPoint.y, newEndPoint.y);
        break;

      case "arrow":
      case "line":
        const lineShape = updatedShape as ArrowShape | LineShape;
        lineShape.points = [
          originalStartPoint.x,
          originalStartPoint.y,
          newEndPoint.x,
          newEndPoint.y,
        ];
        break;
    }

    return updatedShape;
  }
}
