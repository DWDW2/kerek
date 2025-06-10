import express from "express";
import { createServer } from "http";
import { WebSocket, WebSocketServer } from "ws";
import cors from "cors";
import { GameServer } from "./games/GameServer";
import { SharedCanvasServer } from "./shared-canvas/SharedCanvasServer";

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json());

const wss = new WebSocketServer({ server });

const gameServer = new GameServer(wss);
const sharedCanvasServer = new SharedCanvasServer(wss);

wss.on("connection", (ws: WebSocket, req) => {
  console.log("New WebSocket connection to:", req.url);

  const url = req.url;

  if (!url) {
    ws.close(1008, "Invalid URL");
    return;
  }

  if (url.includes("/ws/shared-canvas")) {
    sharedCanvasServer.handleConnection(ws, req);
  } else if (url.includes("/ws/typing-game")) {
    gameServer.handleSpeedTypingConnection(ws, req);
  } else if (url.includes("/ws/tic-tac-toe")) {
    gameServer.handleTicTacToeConnection(ws, req);
  } else {
    gameServer.handleTicTacToeConnection(ws, req);
  }
});

app.get("/health", (req, res) => {
  res.json(gameServer.getHealthStats());
});

app.get("/shared-canvas/health", (req, res) => {
  res.json({
    status: "ok",
    connections: sharedCanvasServer.getConnectionCount(),
  });
});

app.get("/shared-canvas/stats", (req, res) => {
  res.json(sharedCanvasServer.getRoomStats());
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Game server running on port ${PORT}`);
  console.log(`WebSocket server ready for connections`);
});
