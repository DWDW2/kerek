"use client";

import React from "react";
import { Rect, Circle, Line, Text, Arrow, RegularPolygon } from "react-konva";
import type {
  CanvasShape,
  RectangleShape,
  CircleShape,
  TriangleShape,
  ArrowShape,
  LineShape,
  TextShape,
} from "./types";

interface CanvasShapeProps {
  shape: CanvasShape;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDragStart: () => void;
  onDragEnd: (id: string, newAttrs: any) => void;
  onDoubleClick?: (id: string) => void;
}

export default function CanvasShapeComponent({
  shape,
  isSelected,
  onSelect,
  onDragStart,
  onDragEnd,
  onDoubleClick,
}: CanvasShapeProps) {
  const commonProps = {
    id: shape.id,
    x: shape.x,
    y: shape.y,
    fill: shape.fill,
    stroke: shape.stroke,
    strokeWidth: shape.strokeWidth,
    opacity: shape.opacity,
    rotation: shape.rotation,
    scaleX: shape.scaleX,
    scaleY: shape.scaleY,
    visible: shape.visible,
    draggable: shape.draggable,
    onClick: () => onSelect(shape.id),
    onTap: () => onSelect(shape.id),
    onDragStart,
    onDragEnd: (e: any) => {
      onDragEnd(shape.id, {
        x: e.target.x(),
        y: e.target.y(),
      });
    },
    onDblClick: () => onDoubleClick?.(shape.id),
    onDblTap: () => onDoubleClick?.(shape.id),
    shadowBlur: isSelected ? 10 : 0,
    shadowColor: isSelected ? "#0088ff" : "transparent",
    shadowOffset: { x: 0, y: 0 },
  };

  switch (shape.type) {
    case "rectangle":
      const rectShape = shape as RectangleShape;
      return (
        <Rect
          key={shape.id}
          {...commonProps}
          width={rectShape.width}
          height={rectShape.height}
          cornerRadius={rectShape.cornerRadius}
        />
      );

    case "circle":
      const circleShape = shape as CircleShape;
      return (
        <Circle key={shape.id} {...commonProps} radius={circleShape.radius} />
      );

    case "triangle":
      const triangleShape = shape as TriangleShape;
      return (
        <Line
          key={shape.id}
          {...commonProps}
          points={[
            ...triangleShape.points,
            triangleShape.points[0],
            triangleShape.points[1],
          ]}
          closed={true}
          lineCap="round"
          lineJoin="round"
        />
      );

    case "arrow":
      const arrowShape = shape as ArrowShape;
      return (
        <Arrow
          key={shape.id}
          {...commonProps}
          points={arrowShape.points}
          pointerLength={arrowShape.pointerLength}
          pointerWidth={arrowShape.pointerWidth}
        />
      );

    case "line":
      const lineShape = shape as LineShape;
      return (
        <Line
          key={shape.id}
          {...commonProps}
          points={lineShape.points}
          lineCap="round"
          lineJoin="round"
        />
      );

    case "text":
      const textShape = shape as TextShape;

      return (
        <Text
          key={shape.id}
          {...commonProps}
          text={textShape.text}
          fontSize={textShape.fontSize}
          fontFamily={textShape.fontFamily}
          fontStyle={textShape.fontStyle}
          textDecoration={textShape.textDecoration}
          align={textShape.align}
          verticalAlign={textShape.verticalAlign}
          width={textShape.width}
          height={textShape.height}
          padding={4}
        />
      );

    default:
      return null;
  }
}

export function TriangleShape({
  shape,
  isSelected,
  onSelect,
  onDragStart,
  onDragEnd,
}: {
  shape: TriangleShape;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDragStart: () => void;
  onDragEnd: (id: string, newAttrs: any) => void;
}) {
  const commonProps = {
    id: shape.id,
    x: shape.x,
    y: shape.y,
    fill: shape.fill,
    stroke: shape.stroke,
    strokeWidth: shape.strokeWidth,
    opacity: shape.opacity,
    rotation: shape.rotation,
    scaleX: shape.scaleX,
    scaleY: shape.scaleY,
    visible: shape.visible,
    draggable: shape.draggable,
    onClick: () => onSelect(shape.id),
    onTap: () => onSelect(shape.id),
    onDragStart,
    onDragEnd: (e: any) => {
      onDragEnd(shape.id, {
        x: e.target.x(),
        y: e.target.y(),
      });
    },
    shadowBlur: isSelected ? 10 : 0,
    shadowColor: isSelected ? "#0088ff" : "transparent",
    shadowOffset: { x: 0, y: 0 },
  };

  return (
    <Line
      key={shape.id}
      {...commonProps}
      points={[...shape.points, shape.points[0], shape.points[1]]}
      closed={true}
      lineCap="round"
      lineJoin="round"
    />
  );
}
