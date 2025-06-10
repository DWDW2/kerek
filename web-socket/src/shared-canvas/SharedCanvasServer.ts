import { WebSocket, WebSocketServer } from "ws";
import { IncomingMessage } from "http";
import { SharedCanvasManager } from "./SharedCanvasManager";

export class SharedCanvasServer {
  private wss: WebSocketServer;
  private sharedCanvasManager: SharedCanvasManager;

  constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.sharedCanvasManager = new SharedCanvasManager();
  }

  public handleConnection(ws: WebSocket, req: IncomingMessage) {
    console.log("Shared canvas connection established");

    const url = new URL(req.url || "", "http://localhost");

    this.sharedCanvasManager.handleConnection(ws);
  }

  public getConnectionCount(): number {
    return this.sharedCanvasManager.getConnectionCount();
  }

  public getRoomStats() {
    return this.sharedCanvasManager.getRoomStats();
  }
}
