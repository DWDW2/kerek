import { WebSocket } from "ws";

interface CanvasConnection {
  ws: WebSocket;
  userId: string;
  userName?: string;
  roomId?: string;
  color?: string;
  authenticated: boolean;
}

interface SharedCanvasRoom {
  roomId: string;
  connections: Map<string, CanvasConnection>;
  shapes: any[];
  users: Map<
    string,
    {
      userId: string;
      userName?: string;
      color: string;
      cursor?: { x: number; y: number };
    }
  >;
}

const USER_COLORS = [
  "#ff6b6b",
  "#4ecdc4",
  "#45b7d1",
  "#96ceb4",
  "#ffeaa7",
  "#dda0dd",
  "#98d8c8",
  "#f7dc6f",
  "#bb8fce",
  "#85c1e9",
];

export class SharedCanvasManager {
  private connections: Map<string, CanvasConnection> = new Map();
  private rooms: Map<string, SharedCanvasRoom> = new Map();
  private colorIndex = 0;

  public handleConnection(ws: WebSocket) {
    const connectionId = `conn_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const userColor = USER_COLORS[this.colorIndex % USER_COLORS.length];
    this.colorIndex++;

    const connection: CanvasConnection = {
      ws,
      userId: "", // Will be set when user_info is received
      authenticated: false,
      color: userColor,
    };

    this.connections.set(connectionId, connection);

    console.log(`New canvas connection: ${connectionId}`);

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        this.handleMessage(connectionId, data);
      } catch (error) {
        console.error("Error parsing message:", error);
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Invalid JSON format",
          })
        );
      }
    });

    ws.on("close", () => {
      this.handleDisconnection(connectionId);
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      this.handleDisconnection(connectionId);
    });

    ws.send(
      JSON.stringify({
        type: "connected",
        color: userColor,
        connectionId,
      })
    );
  }

  private handleMessage(connectionId: string, data: any) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const { type } = data;

    switch (type) {
      case "user_info":
        this.handleUserInfo(connectionId, data);
        break;
      case "join_room":
        this.handleJoinRoom(connectionId, data.roomId);
        break;
      case "leave_room":
        this.handleLeaveRoom(connectionId, data.roomId);
        break;
      case "canvas_update":
        this.handleCanvasUpdate(connectionId, data.shapes);
        break;
      case "shape_update":
        this.handleShapeUpdate(connectionId, data.shape);
        break;
      case "shape_delete":
        this.handleShapeDelete(connectionId, data.shapeId);
        break;
      case "cursor_move":
        this.handleCursorMove(connectionId, data.position);
        break;
      case "user_selection":
        this.handleUserSelection(connectionId, data.selectedShapeIds);
        break;
      default:
        console.log("Unknown message type:", type);
        connection.ws.send(
          JSON.stringify({
            type: "error",
            message: `Unknown message type: ${type}`,
          })
        );
    }
  }

  private handleUserInfo(connectionId: string, data: any) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const { userId, userName, token } = data;

    if (!userId || !token) {
      connection.ws.send(
        JSON.stringify({
          type: "error",
          message: "User ID and token are required",
        })
      );
      return;
    }

    // Set user information
    connection.userId = userId;
    connection.userName = userName;
    connection.authenticated = true;

    console.log(`User authenticated: ${userId} (${userName})`);

    connection.ws.send(
      JSON.stringify({
        type: "user_authenticated",
        userId,
        userName,
        color: connection.color,
      })
    );
  }

  private handleJoinRoom(connectionId: string, roomId: string) {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.authenticated) {
      connection?.ws.send(
        JSON.stringify({
          type: "error",
          message: "Authentication required before joining room",
        })
      );
      return;
    }

    if (connection.roomId) {
      this.handleLeaveRoom(connectionId, connection.roomId);
    }

    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        roomId,
        connections: new Map(),
        shapes: [],
        users: new Map(),
      };
      this.rooms.set(roomId, room);
    }

    room.connections.set(connectionId, connection);
    room.users.set(connection.userId, {
      userId: connection.userId,
      userName: connection.userName,
      color: connection.color!,
    });
    connection.roomId = roomId;

    connection.ws.send(
      JSON.stringify({
        type: "room_joined",
        roomId,
        userId: connection.userId,
        shapes: room.shapes,
        users: Array.from(room.users.values()),
        userCount: room.connections.size,
      })
    );

    this.broadcastToRoom(
      roomId,
      {
        type: "user_joined",
        user: {
          userId: connection.userId,
          userName: connection.userName,
          color: connection.color,
        },
        userCount: room.connections.size,
      },
      connectionId
    );

    console.log(`User ${connection.userId} joined room ${roomId}`);
  }

  private handleLeaveRoom(connectionId: string, roomId: string) {
    const connection = this.connections.get(connectionId);
    const room = this.rooms.get(roomId);

    if (!connection || !room) return;

    room.connections.delete(connectionId);
    room.users.delete(connection.userId);
    connection.roomId = undefined;

    if (room.connections.size === 0) {
      this.rooms.delete(roomId);
      console.log(`Room ${roomId} deleted (no users left)`);
    } else {
      this.broadcastToRoom(roomId, {
        type: "user_left",
        userId: connection.userId,
        userCount: room.connections.size,
      });
    }

    console.log(`User ${connection.userId} left room ${roomId}`);
  }

  private handleCanvasUpdate(connectionId: string, shapes: any[]) {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.roomId) return;

    const room = this.rooms.get(connection.roomId);
    if (!room) return;

    const updatedShapes = shapes.map((shape) => ({
      ...shape,
      userId: shape.userId || connection.userId,
      timestamp: shape.timestamp || Date.now(),
    }));

    room.shapes = updatedShapes;

    this.broadcastToRoom(
      connection.roomId,
      {
        type: "canvas_updated",
        shapes: updatedShapes,
        updatedBy: connection.userId,
        timestamp: Date.now(),
      },
      connectionId
    );
  }

  private handleShapeUpdate(connectionId: string, shape: any) {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.roomId) return;

    const room = this.rooms.get(connection.roomId);
    if (!room) return;

    const updatedShape = {
      ...shape,
      userId: connection.userId,
      timestamp: Date.now(),
    };

    const existingIndex = room.shapes.findIndex(
      (s) => s.id === updatedShape.id
    );
    if (existingIndex >= 0) {
      room.shapes[existingIndex] = updatedShape;
    } else {
      room.shapes.push(updatedShape);
    }

    this.broadcastToRoom(
      connection.roomId,
      {
        type: "shape_updated",
        shape: updatedShape,
        updatedBy: connection.userId,
      },
      connectionId
    );
  }

  private handleShapeDelete(connectionId: string, shapeId: string) {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.roomId) return;

    const room = this.rooms.get(connection.roomId);
    if (!room) return;

    room.shapes = room.shapes.filter((shape) => shape.id !== shapeId);

    this.broadcastToRoom(
      connection.roomId,
      {
        type: "shape_deleted",
        shapeId,
        deletedBy: connection.userId,
      },
      connectionId
    );
  }

  private handleCursorMove(
    connectionId: string,
    position: { x: number; y: number }
  ) {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.roomId) return;

    const room = this.rooms.get(connection.roomId);
    if (!room) return;

    const user = room.users.get(connection.userId);
    if (user) {
      user.cursor = position;
    }

    this.broadcastToRoom(
      connection.roomId,
      {
        type: "cursor_moved",
        userId: connection.userId,
        position,
      },
      connectionId
    );
  }

  private handleUserSelection(
    connectionId: string,
    selectedShapeIds: string[]
  ) {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.roomId) return;

    this.broadcastToRoom(
      connection.roomId,
      {
        type: "user_selection_changed",
        userId: connection.userId,
        selectedShapeIds,
        userColor: connection.color,
      },
      connectionId
    );
  }

  private broadcastToRoom(
    roomId: string,
    message: any,
    excludeConnectionId?: string
  ) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const messageStr = JSON.stringify(message);

    room.connections.forEach((connection, connId) => {
      if (
        connId !== excludeConnectionId &&
        connection.ws.readyState === WebSocket.OPEN
      ) {
        connection.ws.send(messageStr);
      }
    });
  }

  private handleDisconnection(connectionId: string) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    if (connection.roomId) {
      this.handleLeaveRoom(connectionId, connection.roomId);
    }

    this.connections.delete(connectionId);
    console.log(`Canvas connection closed for user: ${connection.userId}`);
  }

  public getConnectionCount(): number {
    return this.connections.size;
  }

  public getRoomCount(): number {
    return this.rooms.size;
  }

  public getRoomStats() {
    const stats = Array.from(this.rooms.entries()).map(([roomId, room]) => ({
      roomId,
      userCount: room.connections.size,
      shapeCount: room.shapes.length,
      users: Array.from(room.users.values()),
    }));

    return {
      totalRooms: this.rooms.size,
      totalConnections: this.connections.size,
      rooms: stats,
    };
  }
}
