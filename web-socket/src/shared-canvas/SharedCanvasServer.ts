import { WebSocketServer } from "ws";
import { Server } from "http";

export class SharedCanvasServer {
  private wss: WebSocketServer;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server });
  }
}
