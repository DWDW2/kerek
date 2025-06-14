export interface Point {
x: number;
y: number;
}

export interface Size {
width: number;
height: number;
}

export type ShapeType =
| "rectangle"
| "circle"
| "triangle"
| "arrow"
| "line"
| "text";

export interface BaseShape {
id: string;
type: ShapeType;
x: number;
y: number;
fill: string;
stroke: string;
strokeWidth: number;
opacity: number;
rotation: number;
scaleX: number;
scaleY: number;
visible: boolean;
draggable: boolean;
timestamp: number;
userId?: string;
}

export interface RectangleShape extends BaseShape {
type: "rectangle";
width: number;
height: number;
cornerRadius: number;
}

export interface CircleShape extends BaseShape {
type: "circle";
radius: number;
}

export interface TriangleShape extends BaseShape {
type: "triangle";
points: number[];
}

export interface ArrowShape extends BaseShape {
type: "arrow";
points: number[];
pointerLength: number;
pointerWidth: number;
}

export interface LineShape extends BaseShape {
type: "line";
points: number[];
}

export interface TextShape extends BaseShape {
type: "text";
text: string;
fontSize: number;
fontFamily: string;
fontStyle: string;
textDecoration: string;
align: string;
verticalAlign: string;
width?: number;
height?: number;
}

export type CanvasShape =
| RectangleShape
| CircleShape
| TriangleShape
| ArrowShape
| LineShape
| TextShape;

export interface DrawingTool {
type: ShapeType;
name: string;
icon: string;
cursor: string;
}

export interface CanvasState {
shapes: CanvasShape[];
selectedShapeIds: string[];
tool: ShapeType | "select" | "pan";
isDrawing: boolean;
currentDrawingShape: CanvasShape | null;
}

export interface CanvasConfig {
width: number;
height: number;
scale: number;
offsetX: number;
offsetY: number;
backgroundColor: string;
gridEnabled: boolean;
snapToGrid: boolean;
gridSize: number;
}

export interface DrawingOptions {
fill: string;
stroke: string;
strokeWidth: number;
fontSize: number;
fontFamily: string;
}
