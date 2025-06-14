import WebSocket from "ws";
import { BaseShape } from "./types";

interface Message {
  type: string;
}

interface JoinRoom extends Message {
  roomId: string;
  userId: string;
}

interface UpdateCanvas extends Message {
  roomId: string;
  userId: string;
  shapes: BaseShape[];
}

interface CursorMove extends Message {
  position: { x: number; y: number };
  userId: string;
}

interface UserSelection extends Message {
  selectedShapeIds: string[];
  userId: string;
}

interface ShapeUpdate extends Message {
  roomId: string;
  userId: string;
  shape: BaseShape;
}

interface ShapeDelete extends Message {
  roomId: string;
  userId: string;
  shapeId: string;
}
const rooms: Map<string, Map<string, any>> = new Map();
const user_shapes: Map<string, any> = new Map();
const connections: Map<string, WebSocket> = new Map();
const userRooms: Map<string, string> = new Map();
export class SharedCanvasService {
  private ws: WebSocket;

  constructor(ws: WebSocket) {
    this.ws = ws;
  }

  async handleMessage() {
    this.ws.send(JSON.stringify({ type: "connected" }));

    this.ws.on("message", (data) => {
      console.log(data.toString());
      const response: Message = JSON.parse(data.toString());
      console.log(response);

      this.handleMessageType(response);
    });

    this.ws.on("close", () => {
      this.handleUserDisconnect();
    });
  }

  private handleMessageType(message: Message) {
    switch (message.type) {
      case "join_room":
        this.handleJoinRoom(message as JoinRoom);
        break;
      case "canvas_update":
        this.handleCanvasUpdate(message as UpdateCanvas);
        break;
      case "cursor_move":
        this.handleCursorMove(message as CursorMove);
        break;
      case "user_selection":
        this.handleUserSelection(message as UserSelection);
        break;
      case "shape_update":
        this.handleShapeUpdate(message as ShapeUpdate);
        break;
      case "shape_delete":
        this.handleShapeDelete(message as ShapeDelete);
        break;
      default:
        console.log("Unknown message type:", message.type);
    }
  }

  private handleJoinRoom(message: JoinRoom) {
    if (!rooms.has(message.roomId)) {
      rooms.set(message.roomId, new Map());
    }

    const room = rooms.get(message.roomId)!;
    room.set(message.userId, { shapes: [], cursor: null, selectedShapes: [] });

    connections.set(message.userId, this.ws);
    userRooms.set(message.userId, message.roomId);

    this.ws.send(
      JSON.stringify({
        type: "room_joined",
        roomId: message.roomId,
        userCount: room.size,
        shapes: this.getAllShapesInRoom(message.roomId),
      })
    );

    this.broadcastToRoom(message.roomId, message.userId, {
      type: "user_joined",
      user: {
        userId: message.userId,
        color: this.generateUserColor(message.userId),
      },
      userCount: room.size,
    });
  }

  private handleCanvasUpdate(message: UpdateCanvas) {
    const room = rooms.get(message.roomId);
    if (room && room.has(message.userId)) {
      room.get(message.userId).shapes = [...message.shapes];

      this.broadcastToRoom(message.roomId, message.userId, {
        type: "canvas_update",
        userId: message.userId,
        shapes: message.shapes,
      });
    }
  }

  private handleCursorMove(message: CursorMove) {
    const roomId = userRooms.get(message.userId);
    if (roomId) {
      const room = rooms.get(roomId);
      if (room && room.has(message.userId)) {
        room.get(message.userId).cursor = message.position;

        this.broadcastToRoom(roomId, message.userId, {
          type: "cursor_moved",
          userId: message.userId,
          position: message.position,
        });
      }
    }
  }

  private handleUserSelection(message: UserSelection) {
    const roomId = userRooms.get(message.userId);
    if (roomId) {
      const room = rooms.get(roomId);
      if (room && room.has(message.userId)) {
        room.get(message.userId).selectedShapes = message.selectedShapeIds;

        this.broadcastToRoom(roomId, message.userId, {
          type: "user_selection_changed",
          userId: message.userId,
          selectedShapeIds: message.selectedShapeIds,
        });
      }
    }
  }

  private handleShapeUpdate(message: ShapeUpdate) {
    const room = rooms.get(message.roomId);
    if (room && room.has(message.userId)) {
      const userShapes = room.get(message.userId).shapes;
      const shapeIndex = userShapes.findIndex(
        (s: BaseShape) => s.id === message.shape.id
      );

      if (shapeIndex >= 0) {
        userShapes[shapeIndex] = message.shape;
      } else {
        userShapes.push(message.shape);
      }

      this.broadcastToRoom(message.roomId, message.userId, {
        type: "shape_updated",
        shape: message.shape,
        updatedBy: message.userId,
      });
    }
  }

  private handleShapeDelete(message: ShapeDelete) {
    const room = rooms.get(message.roomId);
    if (room && room.has(message.userId)) {
      const userShapes = room.get(message.userId).shapes;
      const filteredShapes = userShapes.filter(
        (s: BaseShape) => s.id !== message.shapeId
      );
      room.get(message.userId).shapes = filteredShapes;

      this.broadcastToRoom(message.roomId, message.userId, {
        type: "shape_deleted",
        shapeId: message.shapeId,
        deletedBy: message.userId,
      });
    }
  }

  private handleUserDisconnect() {
    let disconnectedUserId: string | null = null;
    for (const [userId, ws] of connections.entries()) {
      if (ws === this.ws) {
        disconnectedUserId = userId;
        break;
      }
    }

    if (disconnectedUserId) {
      const roomId = userRooms.get(disconnectedUserId);
      if (roomId) {
        const room = rooms.get(roomId);
        if (room) {
          room.delete(disconnectedUserId);

          this.broadcastToRoom(roomId, disconnectedUserId, {
            type: "user_left",
            userId: disconnectedUserId,
            userCount: room.size,
          });

          if (room.size === 0) {
            rooms.delete(roomId);
          }
        }

        userRooms.delete(disconnectedUserId);
      }

      connections.delete(disconnectedUserId);
    }
  }

  private broadcastToRoom(roomId: string, excludeUserId: string, message: any) {
    const room = rooms.get(roomId);
    if (room) {
      for (const userId of room.keys()) {
        if (userId !== excludeUserId) {
          const userWs = connections.get(userId);
          if (userWs && userWs.readyState === WebSocket.OPEN) {
            userWs.send(JSON.stringify(message));
          }
        }
      }
    }
  }

  private getAllShapesInRoom(roomId: string): BaseShape[] {
    const room = rooms.get(roomId);
    if (!room) return [];

    const allShapes: BaseShape[] = [];
    for (const userData of room.values()) {
      allShapes.push(...userData.shapes);
    }
    return allShapes;
  }

  private generateUserColor(userId: string): string {
    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#96CEB4",
      "#FFEAA7",
      "#DDA0DD",
      "#98D8C8",
      "#F7DC6F",
      "#BB8FCE",
      "#85C1E9",
    ];

    const hash = userId.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);

    return colors[Math.abs(hash) % colors.length];
  }
}
