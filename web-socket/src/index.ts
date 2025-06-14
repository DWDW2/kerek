import WebSocket from "ws";
import { SharedCanvasService } from "./shared-canvas/SharedCanvasService";
import { GameServer } from "./games/GameServer";

const wss = new WebSocket.Server({ port: 3001 });

wss.on("connection", (ws, data) => {
  console.log("Connection Estabilished");
  if (data.url === "/ws/shared-canvas") {
    console.log("got here");
    const sharedCanvas = new SharedCanvasService(ws);
    sharedCanvas.handleMessage();
  }

  if (data.url === "/ws/game") {
    const gameService = new GameServer(wss);
    gameService.handleSpeedTypingConnection(ws, data);
    gameService.handleTicTacToeConnection(ws, data);
  }
  ws.on("close", () => {
    console.log("Client disconnected");
  });

  ws.on("error", (error) => {
    console.error(`WebSocket error: ${error}`);
  });
});
