import { WebSocket, WebSocketServer } from "ws";
import { Server } from "http";

interface SharedCanvasRoom {
  roomId: string;
  users: string[];
}

export class SharedCanvasManager {
  private wss: WebSocketServer;
  private rooms: Map<string, SharedCanvasRoom> = new Map();
  constructor(server: Server) {
    this.wss = new WebSocketServer({ server });
  }

  public handleConnection() {
    this.wss.on("connection", (ws, req) => {
      console.log("New WebSocket connection");
      const url = req.url;

      this.handleMessage();
    });
  }

  private handleMessage() {
    this.wss.on("message", (message) => {
      const data = JSON.parse(message.toString());
      const { type, roomId, userId } = data;

      switch (type) {
        case "join":
          this.handleJoin(roomId, userId);
          break;
        case "leave":
          this.handleLeave(roomId, userId);
          break;
        case "message":
          this.handleUserMessage(roomId, userId, message);
      }
    });
  }

  private handleJoin(roomId: string, userId: string) {
    const room = this.rooms.get(roomId);
    if (!room) {
      this.rooms.set(roomId, { roomId, users: [...userId] });
    }
  }

  private handleLeave(roomId: string, userId: string) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.users = room.users.filter((user) => user !== userId);
    }
  }

  private handleUserMessage(roomId: string, userId: string, message: any) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.users.forEach((user) => {
        if (user !== userId) {
          this.wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(
                JSON.stringify({
                  type: "message",
                  roomId,
                  userId,
                  message,
                })
              );
            }
          });
        }
      });
    }
  }
}
