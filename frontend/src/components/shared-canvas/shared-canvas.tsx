"use client";
import React, { useRef, useCallback, useEffect, useState } from "react";
import { Stage, Layer, Rect } from "react-konva";
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
  conversationId: string;
  className?: string;
}

interface CollaborativeUser {
  userId: string;
  color: string;
  cursor?: { x: number; y: number };
  selectedShapeIds?: string[];
}

export default function SharedCanvas({
  conversationId,
  className = "",
}: SharedCanvasProps) {
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

  const { user, token } = useAuth();
  const [ws, setWs] = useState<WebSocket | null>(null);
  const roomId = conversationId;
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentUserColor, setCurrentUserColor] = useState<string>("");
  const [collaborativeUsers, setCollaborativeUsers] = useState<
    Map<string, CollaborativeUser>
  >(new Map());
  const [remoteCursors, setRemoteCursors] = useState<
    Map<string, { x: number; y: number; color: string }>
  >(new Map());

  const connectionAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const reconnectWebSocket = useCallback(() => {
    if (connectionAttemptRef.current >= 5) {
      console.log("Max reconnection attempts reached");
      return;
    }

    const delay = Math.pow(2, connectionAttemptRef.current) * 1000;
    console.log(
      `Scheduling reconnection in ${delay}ms (attempt ${
        connectionAttemptRef.current + 1
      })`
    );

    reconnectTimeoutRef.current = setTimeout(() => {
      connectionAttemptRef.current += 1;
      setIsConnecting(false); 
    }, delay);
  }, []);

  useEffect(() => {
    if (!user || !token) {
      console.log("User not authenticated, skipping WebSocket connection");
      return;
    }

    if (isConnecting || isConnected || wsRef.current) {
      return;
    }

    if (!process.env.NEXT_PUBLIC_WS_URL) {
      console.error("NEXT_PUBLIC_WS_URL is not configured");
      return;
    }

    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}/ws/shared-canvas`;
    console.log(
      "Attempting to connect to WebSocket:",
      wsUrl,
      "for user:",
      user.id
    );

    setIsConnecting(true);
    const websocket = new WebSocket(wsUrl);
    wsRef.current = websocket;

    websocket.onopen = () => {
      console.log("WebSocket connected to shared canvas");
      setIsConnecting(false);
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("WebSocket message received:", data.type, data);

        switch (data.type) {
          case "connected":
            console.log("Canvas connection established");
            setCurrentUserColor(data.color);
            connectionAttemptRef.current = 0;             
	    setWs(websocket);

            websocket.send(
              JSON.stringify({
                type: "user_info",
                userId: user.id,
                userName: user.username || user.email,
                token: token,
              })
            );
            break;

          case "user_authenticated":
            console.log("User authenticated successfully");
            setCurrentUserId(data.userId);
            setIsConnected(true);

            websocket.send(
              JSON.stringify({
                type: "join_room",
                roomId: roomId,
                userId: user.id,
              })
            );
            break;

          case "room_joined":
            console.log("Joined room:", data.roomId);
            setUserCount(data.userCount);
            setCanvasState((prev) => ({
              ...prev,
              shapes: data.shapes || [],
            }));

            const users = new Map<string, CollaborativeUser>();
            data.users?.forEach((user: CollaborativeUser) => {
              if (user.userId !== data.userId) {
                users.set(user.userId, user);
              }
            });
            setCollaborativeUsers(users);
            break;

          case "canvas_updated":
            setCanvasState((prev) => {
              if (data.updatedBy && data.updatedBy === currentUserId) {
                return prev;
              }
              return {
                ...prev,
                shapes: data.shapes || [],
              };
            });
            break;

          case "shape_updated":
            setCanvasState((prev) => {
              if (data.updatedBy && data.updatedBy === currentUserId) {
                return prev;
              }
              const existingIndex = prev.shapes.findIndex(
                (s) => s.id === data.shape.id
              );
              if (existingIndex >= 0) {
                const updatedShapes = [...prev.shapes];
                updatedShapes[existingIndex] = data.shape;
                return { ...prev, shapes: updatedShapes };
              } else {
                return { ...prev, shapes: [...prev.shapes, data.shape] };
              }
            });
            break;

          case "shape_deleted":
            setCanvasState((prev) => {
              if (data.deletedBy && data.deletedBy === currentUserId) {
                return prev;
              }
              return {
                ...prev,
                shapes: prev.shapes.filter(
                  (shape) => shape.id !== data.shapeId
                ),
              };
            });
            break;

          case "user_joined":
            console.log("User joined:", data.user);
            setUserCount(data.userCount);
            if (data.user.userId !== currentUserId) {
              setCollaborativeUsers((prev) => {
                const newUsers = new Map(prev);
                newUsers.set(data.user.userId, data.user);
                return newUsers;
              });
            }
            break;

          case "user_left":
            console.log("User left:", data.userId);
            setUserCount(data.userCount);
            setCollaborativeUsers((prev) => {
              const newUsers = new Map(prev);
              newUsers.delete(data.userId);
              return newUsers;
            });
            setRemoteCursors((prev) => {
              const newCursors = new Map(prev);
              newCursors.delete(data.userId);
              return newCursors;
            });
            break;

          case "cursor_moved":
            if (data.userId !== currentUserId) {
              setCollaborativeUsers((prevUsers) => {
                const user = prevUsers.get(data.userId);
                if (user) {
                  setRemoteCursors((prev) => {
                    const newCursors = new Map(prev);
                    newCursors.set(data.userId, {
                      x: data.position.x,
                      y: data.position.y,
                      color: user.color,
                    });
                    return newCursors;
                  });
                }
                return prevUsers;
              });
            }
            break;

          case "user_selection_changed":
            if (data.userId !== currentUserId) {
              setCollaborativeUsers((prev) => {
                const newUsers = new Map(prev);
                const user = newUsers.get(data.userId);
                if (user) {
                  user.selectedShapeIds = data.selectedShapeIds;
                  newUsers.set(data.userId, user);
                }
                return newUsers;
              });
            }
            break;

          case "error":
            console.error("WebSocket error:", data.message);
            break;

          default:
            console.log("Unknown message type:", data.type);
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    websocket.onclose = (event) => {
      console.log("WebSocket disconnected:", event.code, event.reason);
      setIsConnected(false);
      setIsConnecting(false);
      setWs(null);
      wsRef.current = null;
      setCollaborativeUsers(new Map());
      setRemoteCursors(new Map());

      if (event.code !== 1000 && connectionAttemptRef.current < 5) {
        reconnectWebSocket();
      }
    };

    websocket.onerror = (error) => {
      console.error("WebSocket connection error:", error);
      setIsConnected(false);
      setIsConnecting(false);
    };

    return () => {
      console.log("Cleaning up WebSocket connection");

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (wsRef.current) {
        if (
          wsRef.current.readyState === WebSocket.OPEN ||
          wsRef.current.readyState === WebSocket.CONNECTING
        ) {
          wsRef.current.close(1000, "Component unmounting");
        }
        wsRef.current = null;
      }

      setIsConnecting(false);
      setWs(null);
    };
  }, [roomId, user, token, reconnectWebSocket]); 
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounting");
      }
    };
  }, []);

  useEffect(() => {
    if (!ws || !isConnected || canvasState.shapes.length === 0) return;

    const timeoutId = setTimeout(() => {
      ws.send(
        JSON.stringify({
          type: "canvas_update",
	  roomId: roomId,
	  userId: user?.id || "", 
          shapes: canvasState.shapes,
        })
      );
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [ws, isConnected, canvasState.shapes]);

  useEffect(() => {
    if (!ws || !isConnected) return;

    ws.send(
      JSON.stringify({
        type: "user_selection",
        selectedShapeIds: canvasState.selectedShapeIds,
      })
    );
  }, [ws, isConnected, canvasState.selectedShapeIds]);

  const sendCursorPosition = useCallback(
    (position: Point) => {
      if (ws && isConnected) {
        ws.send(
          JSON.stringify({
            type: "cursor_move",
            position,
          })
        );
      }
    },
    [ws, isConnected]
  );

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

  const handleMouseMove = useCallback(
    (e: any) => {
      const pos = getPointerPosition(e);

      if (Math.random() < 0.1) {
        sendCursorPosition(pos);
      }

      if (!isDrawing || !startPoint) return;

      if (canvasState.tool === "pan") {
        const dx = pos.x - startPoint.x;
        const dy = pos.y - startPoint.y;
        setCanvasConfig((prev) => ({
          ...prev,
          offsetX: prev.offsetX + dx * canvasConfig.scale,
          offsetY: prev.offsetY + dy * canvasConfig.scale,
        }));
      } else if (
        ["rectangle", "circle", "triangle", "arrow", "line"].includes(
          canvasState.tool
        )
      ) {
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
    },
    [
      isDrawing,
      startPoint,
      canvasState.tool,
      canvasConfig.scale,
      getPointerPosition,
      sendCursorPosition,
      drawingOptions,
    ]
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

          startTextEditing(newShape.id, newShape as TextShape, pos);
          setIsDrawing(false);
          setStartPoint(null);
        }
      }
    },
    [canvasState.tool, getPointerPosition, drawingOptions]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawing) return;

    if (canvasState.currentDrawingShape) {
      setCanvasState((prev) => ({
        ...prev,
        shapes: [...prev.shapes, prev.currentDrawingShape!],
        selectedShapeIds: [prev.currentDrawingShape!.id],
        currentDrawingShape: null,
      }));
    }

    setIsDrawing(false);
    setStartPoint(null);
  }, [isDrawing, canvasState.currentDrawingShape]);

  const startTextEditing = useCallback(
    (shapeId: string, shape: TextShape, position: Point) => {
      setEditingTextId(shapeId);
      setEditingText(shape.text || "");

      const stage = stageRef.current;
      if (stage) {
        const absolutePosition = stage.getAbsoluteTransform().point({
          x: position.x * canvasConfig.scale + canvasConfig.offsetX,
          y: position.y * canvasConfig.scale + canvasConfig.offsetY,
        });
        setTextPosition(absolutePosition);
      }

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.select();
        }
      }, 10);
    },
    [canvasConfig.scale, canvasConfig.offsetX, canvasConfig.offsetY]
  );

  const finishTextEditing = useCallback(() => {
    if (!editingTextId) return;

    setCanvasState((prev) => ({
      ...prev,
      shapes: prev.shapes.map((shape) =>
        shape.id === editingTextId ? { ...shape, text: editingText } : shape
      ),
    }));

    setEditingTextId(null);
    setEditingText("");
    setTextPosition(null);
  }, [editingTextId, editingText]);

  const handleShapeClick = useCallback(
    (shapeId: string, shape: any) => {
      if (canvasState.tool === "select") {
        setCanvasState((prev) => ({
          ...prev,
          selectedShapeIds: [shapeId],
        }));

        if (shape.type === "text") {
          startTextEditing(shapeId, shape as TextShape, {
            x: shape.x,
            y: shape.y,
          });
        }
      }
    },
    [canvasState.tool, startTextEditing]
  );

  const handleShapeChange = useCallback((shapeId: string, newAttrs: any) => {
    setCanvasState((prev) => ({
      ...prev,
      shapes: prev.shapes.map((shape) =>
        shape.id === shapeId ? { ...shape, ...newAttrs } : shape
      ),
    }));
  }, []);

  const deleteSelectedShapes = useCallback(() => {
    const deletedIds = canvasState.selectedShapeIds;

    setCanvasState((prev) => ({
      ...prev,
      shapes: prev.shapes.filter(
        (shape) => !prev.selectedShapeIds.includes(shape.id)
      ),
      selectedShapeIds: [],
    }));

    if (ws && isConnected) {
      deletedIds.forEach((shapeId) => {
        ws.send(
          JSON.stringify({
            type: "shape_delete",
            shapeId,
          })
        );
      });
    }
  }, [canvasState.selectedShapeIds, ws, isConnected]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (editingTextId) return;
        e.preventDefault();
        deleteSelectedShapes();
      }

      if (e.key === "Escape") {
        if (editingTextId) {
          finishTextEditing();
        } else {
          setCanvasState((prev) => ({ ...prev, selectedShapeIds: [] }));
        }
      }

      if (e.key === "Enter" && editingTextId) {
        finishTextEditing();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteSelectedShapes, editingTextId, finishTextEditing]);

  const getShapeCollaborativeHighlight = useCallback(
    (shapeId: string) => {
      for (const user of collaborativeUsers.values()) {
        if (user.selectedShapeIds?.includes(shapeId)) {
          return user.color;
        }
      }
      return null;
    },
    [collaborativeUsers]
  );

  const renderShapes = () => {
    const allShapes = [
      ...canvasState.shapes,
      ...(canvasState.currentDrawingShape
        ? [canvasState.currentDrawingShape]
        : []),
    ];

    return allShapes.map((shape) => {
      const isSelected = canvasState.selectedShapeIds.includes(shape.id);
      const collaborativeHighlight = getShapeCollaborativeHighlight(shape.id);

      return (
        <CanvasShapeComponent
          key={shape.id}
          shape={shape}
          isSelected={isSelected}
          collaborativeHighlight={collaborativeHighlight}
          onClick={() => handleShapeClick(shape.id, shape)}
          onChange={(newAttrs) => handleShapeChange(shape.id, newAttrs)}
          draggable={canvasState.tool === "select" && !editingTextId}
        />
      );
    });
  };

  const renderRemoteCursors = () => {
    return Array.from(remoteCursors.entries()).map(([userId, cursor]) => (
      <React.Fragment key={`cursor-${userId}`}>
        <Rect
          x={cursor.x * canvasConfig.scale + canvasConfig.offsetX - 2}
          y={cursor.y * canvasConfig.scale + canvasConfig.offsetY - 2}
          width={4}
          height={4}
          fill={cursor.color}
          listening={false}
        />

        <Rect
          x={cursor.x * canvasConfig.scale + canvasConfig.offsetX + 8}
          y={cursor.y * canvasConfig.scale + canvasConfig.offsetY - 10}
          width={60}
          height={16}
          fill={cursor.color}
          cornerRadius={3}
          listening={false}
          opacity={0.8}
        />
      </React.Fragment>
    ));
  };

  return (
    <div className={`w-full h-full flex flex-col ${className}`}>
      <CanvasToolbar
        tool={canvasState.tool}
        onToolChange={(tool) =>
          setCanvasState((prev) => ({ ...prev, tool, selectedShapeIds: [] }))
        }
        drawingOptions={drawingOptions}
        onDrawingOptionsChange={setDrawingOptions}
        canvasConfig={canvasConfig}
        onCanvasConfigChange={setCanvasConfig}
        onClearCanvas={() =>
          setCanvasState((prev) => ({
            ...prev,
            shapes: [],
            selectedShapeIds: [],
          }))
        }
        connectionStatus={{
          isConnected,
          userCount,
          currentUserColor,
        }}
      />

      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        <Stage
          ref={stageRef}
          width={canvasConfig.width}
          height={canvasConfig.height}
          scaleX={canvasConfig.scale}
          scaleY={canvasConfig.scale}
          x={canvasConfig.offsetX}
          y={canvasConfig.offsetY}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{ cursor: canvasState.tool === "pan" ? "grab" : "default" }}
        >
          <Layer>
            <Rect
              x={-canvasConfig.offsetX / canvasConfig.scale}
              y={-canvasConfig.offsetY / canvasConfig.scale}
              width={canvasConfig.width / canvasConfig.scale}
              height={canvasConfig.height / canvasConfig.scale}
              fill={canvasConfig.backgroundColor}
              listening={false}
            />

            {renderShapes()}

            {renderRemoteCursors()}
          </Layer>
        </Stage>

        {editingTextId && textPosition && (
          <textarea
            ref={textareaRef}
            value={editingText}
            onChange={(e) => setEditingText(e.target.value)}
            onBlur={finishTextEditing}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                finishTextEditing();
              }
            }}
            style={{
              position: "absolute",
              left: textPosition.x,
              top: textPosition.y,
              fontSize: `${drawingOptions.fontSize}px`,
              fontFamily: drawingOptions.fontFamily,
              border: "1px solid #ccc",
              outline: "none",
              resize: "none",
              background: "transparent",
              padding: "2px",
              minWidth: "100px",
              minHeight: "20px",
            }}
            autoFocus
          />
        )}
      </div>
    </div>
  );
}
