import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import cors from "cors";
import { GameRoom, GameMessage, Player } from "./types";
import { createInitialGameState, makeMove, resetGame } from "./gameLogic";

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

const gameRooms = new Map<string, GameRoom>();

function broadcastToRoom(gameId: string, message: GameMessage) {
  const room = gameRooms.get(gameId);
  if (room) {
    room.players.forEach(({ ws }) => {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify(message));
      }
    });
  }
}

function assignPlayerRole(room: GameRoom): Player | null {
  if (!room.gameState.players.X) return "X";
  if (!room.gameState.players.O) return "O";
  return null;
}

wss.on("connection", (ws, req) => {
  console.log("New WebSocket connection");

  ws.on("message", (data) => {
    try {
      const message: GameMessage = JSON.parse(data.toString());
      const { type, gameId, playerId, position } = message;

      switch (type) {
        case "join":
          if (!gameId || !playerId) {
            ws.send(
              JSON.stringify({
                type: "error",
                gameId: "",
                message: "Game ID and Player ID are required",
              })
            );
            return;
          }

          let room = gameRooms.get(gameId);
          if (!room) {
            room = {
              gameId,
              gameState: createInitialGameState(gameId),
              players: new Map(),
            };
            gameRooms.set(gameId, room);
          }

          if (room.players.has(playerId)) {
            const existingPlayer = room.players.get(playerId)!;
            existingPlayer.ws = ws;
          } else {
            if (room.players.size >= 2) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  gameId,
                  message: "Game room is full",
                })
              );
              return;
            }

            const playerRole = assignPlayerRole(room);
            if (!playerRole) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  gameId,
                  message: "Could not assign player role",
                })
              );
              return;
            }

            room.players.set(playerId, { ws, player: playerRole });
            room.gameState.players[playerRole] = playerId;

            broadcastToRoom(gameId, {
              type: "playerJoined",
              gameId,
              playerId,
              player: playerRole,
            });
          }

          ws.send(
            JSON.stringify({
              type: "gameState",
              gameId,
              gameState: room.gameState,
            })
          );

          break;

        case "move":
          if (!gameId || !playerId || position === undefined) {
            ws.send(
              JSON.stringify({
                type: "error",
                gameId: gameId || "",
                message: "Invalid move data",
              })
            );
            return;
          }

          const gameRoom = gameRooms.get(gameId);
          if (!gameRoom) {
            ws.send(
              JSON.stringify({
                type: "error",
                gameId,
                message: "Game room not found",
              })
            );

            return;
          }

          const playerData = gameRoom.players.get(playerId);
          if (!playerData || !playerData.player) {
            ws.send(
              JSON.stringify({
                type: "error",
                gameId,
                message: "Player not found in game",
              })
            );
            return;
          }

          const newGameState = makeMove(
            gameRoom.gameState,
            position,
            playerData.player
          );

          if (newGameState === gameRoom.gameState) {
            ws.send(
              JSON.stringify({
                type: "error",
                gameId,
                message: "Invalid move",
              })
            );
            return;
          }

          gameRoom.gameState = newGameState;

          broadcastToRoom(gameId, {
            type: "gameState",
            gameId,
            gameState: newGameState,
          });

          console.log("newGameState", newGameState);

          break;

        case "reset":
          if (!gameId || !playerId) {
            ws.send(
              JSON.stringify({
                type: "error",
                gameId: gameId || "",
                message: "Game ID and Player ID are required",
              })
            );
            return;
          }

          const resetRoom = gameRooms.get(gameId);
          if (!resetRoom) {
            ws.send(
              JSON.stringify({
                type: "error",
                gameId,
                message: "Game room not found",
              })
            );
            return;
          }

          resetRoom.gameState = resetGame(resetRoom.gameState);

          broadcastToRoom(gameId, {
            type: "gameState",
            gameId,
            gameState: resetRoom.gameState,
          });

          break;

        default:
          ws.send(
            JSON.stringify({
              type: "error",
              gameId: gameId || "",
              message: "Unknown message type",
            })
          );
      }
    } catch (error) {
      console.error("Error processing message:", error);
      ws.send(
        JSON.stringify({
          type: "error",
          gameId: "",
          message: "Invalid message format",
        })
      );
    }
  });

  ws.on("close", () => {
    console.log("WebSocket connection closed");
    gameRooms.forEach((room, gameId) => {
      room.players.forEach((playerData, playerId) => {
        if (playerData.ws === ws) {
          room.players.delete(playerId);

          if (room.gameState.players.X === playerId) {
            room.gameState.players.X = null;
          }
          if (room.gameState.players.O === playerId) {
            room.gameState.players.O = null;
          }

          broadcastToRoom(gameId, {
            type: "playerLeft",
            gameId,
            playerId,
          });

          if (room.players.size === 0) {
            gameRooms.delete(gameId);
          }
        }
      });
    });
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", activeGames: gameRooms.size });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Game server running on port ${PORT}`);
});
