import express from "express";
import { createServer } from "http";
import cors from "cors";
import { GameServer } from "./games/GameServer";

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json());

const gameServer = new GameServer(server);

app.get("/health", (req, res) => {
  res.json(gameServer.getHealthStats());
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Game server running on port ${PORT}`);
});
