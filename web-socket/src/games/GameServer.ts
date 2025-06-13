import { WebSocket, WebSocketServer } from "ws";
import { IncomingMessage } from "http";
import { TicTacToeManager } from "./TicTacToeManager";
import { SpeedTypingManager } from "./SpeedTypingManager";

export class GameServer {
  private wss: WebSocketServer;
  private ticTacToeManager: TicTacToeManager;
  private speedTypingManager: SpeedTypingManager;

  constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.ticTacToeManager = new TicTacToeManager();
    this.speedTypingManager = new SpeedTypingManager();
  }

  public handleSpeedTypingConnection(ws: WebSocket, req: IncomingMessage) {
    console.log("Speed typing game connection established");
    this.speedTypingManager.handleConnection(ws);
  }

  public handleTicTacToeConnection(ws: WebSocket, req: IncomingMessage) {
    console.log("Tic-tac-toe game connection established");
    this.ticTacToeManager.handleConnection(ws);
  }

  getHealthStats() {
    return {
      status: "ok",
      activeGames: this.ticTacToeManager.getActiveGamesCount(),
      activeSpeedTypingGames: this.speedTypingManager.getActiveGamesCount(),
      totalActiveGames:
        this.ticTacToeManager.getActiveGamesCount() +
        this.speedTypingManager.getActiveGamesCount(),
      totalConnections: this.wss.clients.size,
    };
  }
}
