import express from "express";
import { createServer } from "http";
import cors from "cors";
import { GameServer } from "./games/GameServer";
import { SharedCanvasServer } from "./shared-canvas/SharedCanvasServer";

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json());

const gameServer = new GameServer(server);
const sharedCanvasServer = new SharedCanvasServer(server);

app.get("/health", (req, res) => {
  res.json(gameServer.getHealthStats());
});

app.get("/shared-canvas/health", (req, res) => {
  res.json({
    status: "ok",
  });
});

const PORT = process.env.PORT || 3001;
const sharedCanvasPort = process.env.SHARED_CANVAS_PORT || 3002;

server.listen(PORT, () => {
  console.log(`Game server running on port ${PORT}`);
  console.log(`Shared canvas server running on port ${sharedCanvasPort}`);
});
