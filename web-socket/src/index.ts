import WebSocket from "ws";
import { SharedCanvasService } from "./shared-canvas/SharedCanvasService";
import { GameServer } from "./games/GameServer";

const wss = new WebSocket.Server({ port: 3001 });

const gameServer = new GameServer(wss);

wss.on("connection", (ws, data) => {
  console.log("Connection Established");
  console.log("Request URL:", data.url);

  if (data.url === "/ws/shared-canvas") {
    const sharedCanvas = new SharedCanvasService(ws);
    sharedCanvas.handleMessage();
  }

  if (data.url === "/ws/typing-game") {
    gameServer.handleSpeedTypingConnection(ws, data);
  }

  if (data.url === "/ws/tic-tac-toe") {
    gameServer.handleTicTacToeConnection(ws, data);
  }
  ws.on("close", () => {
    console.log("Client disconnected");
  });

  ws.on("error", (error) => {
    console.error(`WebSocket error: ${error}`);
  });
});

wss.on("listening", () => {
  console.log("WebSocket server is listening on port 3001");
  console.log("Available endpoints:");
  console.log("- /ws/shared-canvas");
  console.log("- /ws/typing-game");
  console.log("- /ws/tic-tac-toe");

  setInterval(() => {
    const stats = gameServer.getHealthStats();
    console.log("Game Server Stats:", stats);
  }, 30000);
});
