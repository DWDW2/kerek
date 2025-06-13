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
  collaborativeHighlight?: string | null; // Color of the user who has this shape selected
  onClick: () => void;
  onChange: (newAttrs: any) => void;
  draggable: boolean;
}

export default function CanvasShapeComponent({
  shape,
  isSelected,
  collaborativeHighlight,
  onClick,
  onChange,
  draggable,
}: CanvasShapeProps) {
  // Determine shadow effect based on selection state
  let shadowBlur = 0;
  let shadowColor = "transparent";

  if (isSelected) {
    shadowBlur = 10;
    shadowColor = "#0088ff"; // Current user's selection (blue)
  } else if (collaborativeHighlight) {
    shadowBlur = 8;
    shadowColor = collaborativeHighlight; // Other user's selection
  }

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
    draggable,
    onClick,
    onTap: onClick,
    onDragEnd: (e: any) => {
      onChange({
        x: e.target.x(),
        y: e.target.y(),
        timestamp: Date.now(),
      });
    },
    shadowBlur,
    shadowColor,
    shadowOffset: { x: 0, y: 0 },
    // Add a subtle border for collaborative highlighting
    ...(collaborativeHighlight &&
      !isSelected && {
        strokeWidth: Math.max(shape.strokeWidth, 2),
        stroke: collaborativeHighlight,
      }),
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
  collaborativeHighlight,
  onClick,
  onChange,
  draggable,
}: {
  shape: TriangleShape;
  isSelected: boolean;
  collaborativeHighlight?: string | null;
  onClick: () => void;
  onChange: (newAttrs: any) => void;
  draggable: boolean;
}) {
  // Determine shadow effect based on selection state
  let shadowBlur = 0;
  let shadowColor = "transparent";

  if (isSelected) {
    shadowBlur = 10;
    shadowColor = "#0088ff";
  } else if (collaborativeHighlight) {
    shadowBlur = 8;
    shadowColor = collaborativeHighlight;
  }

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
    draggable,
    onClick,
    onTap: onClick,
    onDragEnd: (e: any) => {
      onChange({
        x: e.target.x(),
        y: e.target.y(),
        timestamp: Date.now(),
      });
    },
    shadowBlur,
    shadowColor,
    shadowOffset: { x: 0, y: 0 },
    // Add a subtle border for collaborative highlighting
    ...(collaborativeHighlight &&
      !isSelected && {
        strokeWidth: Math.max(shape.strokeWidth, 2),
        stroke: collaborativeHighlight,
      }),
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
