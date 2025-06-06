import { WebSocketServer } from "ws";
import { Server } from "http";
import { TicTacToeManager } from "./TicTacToeManager";
import { SpeedTypingManager } from "./SpeedTypingManager";

export class GameServer {
  private wss: WebSocketServer;
  private ticTacToeManager: TicTacToeManager;
  private speedTypingManager: SpeedTypingManager;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server });
    this.ticTacToeManager = new TicTacToeManager();
    this.speedTypingManager = new SpeedTypingManager();
    this.setupWebSocketHandlers();
  }

  private setupWebSocketHandlers() {
    this.wss.on("connection", (ws, req) => {
      console.log("New WebSocket connection");
      const url = req.url;

      if (url?.includes("/ws/typing-game")) {
        this.speedTypingManager.handleConnection(ws);
        return;
      }

      this.ticTacToeManager.handleConnection(ws);
    });
  }

  getHealthStats() {
    return {
      status: "ok",
      activeGames: this.ticTacToeManager.getActiveGamesCount(),
      activeSpeedTypingGames: this.speedTypingManager.getActiveGamesCount(),
      totalActiveGames:
        this.ticTacToeManager.getActiveGamesCount() +
        this.speedTypingManager.getActiveGamesCount(),
    };
  }
}
