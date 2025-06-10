import { WebSocketServer } from "ws";
import { Server } from "http";
import { SharedCanvasManager } from "./SharedCanvasManager";

export class SharedCanvasServer {
  private wss: WebSocketServer;
  private sharedCanvasManager: SharedCanvasManager;
  constructor(server: Server) {
    this.wss = new WebSocketServer({ server });
    this.sharedCanvasManager = new SharedCanvasManager(server);
    this.setupWebSocketHandlers();
  }

  private setupWebSocketHandlers() {
    this.wss.on("connection", (ws, req) => {
      console.log("New WebSocket connection");
      const url = req.url;

      if (url?.includes("/ws/shared-canvas")) {
        this.sharedCanvasManager.handleConnection();
        return;
      }
    });
  }
}
