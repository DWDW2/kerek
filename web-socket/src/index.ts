import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import cors from "cors";
import { GameRoom, GameMessage, Player } from "./types";
import { createInitialGameState, makeMove, resetGame } from "./gameLogic";
import {
  SpeedTypingGameRoom,
  SpeedTypingGameMessage,
} from "./speedTypingTypes";
import {
  createInitialSpeedTypingGameState,
  updatePlayerProgress,
  startCountdown,
  updateCountdown,
  resetSpeedTypingGame,
  addPlayer,
  removePlayer,
} from "./speedTypingLogic";

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

const gameRooms = new Map<string, GameRoom>();
const speedTypingRooms = new Map<string, SpeedTypingGameRoom>();

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

function broadcastToSpeedTypingRoom(
  gameId: string,
  message: SpeedTypingGameMessage
) {
  const room = speedTypingRooms.get(gameId);
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
  const url = req.url;

  if (url?.includes("/ws/typing-game")) {
    handleSpeedTypingConnection(ws);
    return;
  }

  handleTicTacToeConnection(ws);
});

function handleSpeedTypingConnection(ws: any) {
  console.log("Speed typing game connection established");

  ws.on("message", (data: any) => {
    try {
      const message: SpeedTypingGameMessage = JSON.parse(data.toString());
      const { type, gameId, playerId } = message;

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

          let room = speedTypingRooms.get(gameId);
          if (!room) {
            room = {
              gameId,
              gameState: createInitialSpeedTypingGameState(gameId),
              players: new Map(),
            };
            speedTypingRooms.set(gameId, room);
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

            room.players.set(playerId, { ws });
            room.gameState = addPlayer(room.gameState, playerId);

            broadcastToSpeedTypingRoom(gameId, {
              type: "playerJoined",
              gameId,
              playerId,
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

        case "start":
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

          const startRoom = speedTypingRooms.get(gameId);
          if (!startRoom) {
            ws.send(
              JSON.stringify({
                type: "error",
                gameId,
                message: "Game room not found",
              })
            );
            return;
          }

          if (Object.keys(startRoom.gameState.players).length < 2) {
            ws.send(
              JSON.stringify({
                type: "error",
                gameId,
                message: "Need at least 2 players to start",
              })
            );
            return;
          }

          startRoom.gameState = startCountdown(startRoom.gameState);

          broadcastToSpeedTypingRoom(gameId, {
            type: "gameState",
            gameId,
            gameState: startRoom.gameState,
          });

          let countdownValue = 3;
          startRoom.countdownInterval = setInterval(() => {
            countdownValue--;
            startRoom.gameState = updateCountdown(startRoom.gameState);

            broadcastToSpeedTypingRoom(gameId, {
              type: "countdown",
              gameId,
              gameState: startRoom.gameState,
            });

            if (countdownValue <= 0) {
              clearInterval(startRoom.countdownInterval);
              startRoom.countdownInterval = undefined;

              broadcastToSpeedTypingRoom(gameId, {
                type: "gameState",
                gameId,
                gameState: startRoom.gameState,
              });
            }
          }, 1000);

          break;

        case "typing":
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

          const typingRoom = speedTypingRooms.get(gameId);
          if (!typingRoom) {
            ws.send(
              JSON.stringify({
                type: "error",
                gameId,
                message: "Game room not found",
              })
            );
            return;
          }

          if (typingRoom.gameState.gameStatus !== "active") {
            return;
          }

          typingRoom.gameState = updatePlayerProgress(
            typingRoom.gameState,
            playerId,
            message.progress || 0,
            message.wpm || 0,
            message.finished || false,
            message.finishTime
          );

          broadcastToSpeedTypingRoom(gameId, {
            type: "gameState",
            gameId,
            gameState: typingRoom.gameState,
          });

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

          const resetRoom = speedTypingRooms.get(gameId);
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

          if (resetRoom.countdownInterval) {
            clearInterval(resetRoom.countdownInterval);
            resetRoom.countdownInterval = undefined;
          }

          resetRoom.gameState = resetSpeedTypingGame(resetRoom.gameState);

          broadcastToSpeedTypingRoom(gameId, {
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
      console.error("Error processing speed typing message:", error);
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
    console.log("Speed typing WebSocket connection closed");
    speedTypingRooms.forEach((room, gameId) => {
      room.players.forEach(({ ws: playerWs }, playerId) => {
        if (playerWs === ws) {
          room.players.delete(playerId);
          room.gameState = removePlayer(room.gameState, playerId);

          if (room.countdownInterval) {
            clearInterval(room.countdownInterval);
            room.countdownInterval = undefined;
          }

          broadcastToSpeedTypingRoom(gameId, {
            type: "playerLeft",
            gameId,
            playerId,
          });

          if (room.players.size === 0) {
            speedTypingRooms.delete(gameId);
          } else {
            broadcastToSpeedTypingRoom(gameId, {
              type: "gameState",
              gameId,
              gameState: room.gameState,
            });
          }
        }
      });
    });
  });
}

function handleTicTacToeConnection(ws: any) {
  console.log("Tic tac toe game connection established");

  ws.on("message", (data: any) => {
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
}

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    activeGames: gameRooms.size,
    activeSpeedTypingGames: speedTypingRooms.size,
    totalActiveGames: gameRooms.size + speedTypingRooms.size,
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Game server running on port ${PORT}`);
});
