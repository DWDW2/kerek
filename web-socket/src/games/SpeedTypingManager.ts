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

export class SpeedTypingManager {
  private speedTypingRooms = new Map<string, SpeedTypingGameRoom>();

  handleConnection(ws: any) {
    console.log("Speed typing game connection established");

    ws.on("message", (data: any) => {
      try {
        const message: SpeedTypingGameMessage = JSON.parse(data.toString());
        this.handleMessage(ws, message);
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
      this.handleDisconnection(ws);
    });
  }

  private handleMessage(ws: any, message: SpeedTypingGameMessage) {
    const { type, gameId, playerId } = message;

    switch (type) {
      case "join":
        this.handleJoin(ws, gameId, playerId);
        break;
      case "start":
        this.handleStart(ws, gameId, playerId);
        break;
      case "typing":
        this.handleTyping(ws, message);
        break;
      case "reset":
        this.handleReset(ws, gameId, playerId);
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
  }

  private handleJoin(ws: any, gameId?: string, playerId?: string) {
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

    let room = this.speedTypingRooms.get(gameId);
    if (!room) {
      room = {
        gameId,
        gameState: createInitialSpeedTypingGameState(gameId),
        players: new Map(),
      };
      this.speedTypingRooms.set(gameId, room);
    }

    if (room.players.has(playerId)) {
      console.log(`Player ${playerId} reconnecting to game ${gameId}`);
      const existingPlayer = room.players.get(playerId)!;
      existingPlayer.ws = ws;
    } else {
      if (room.players.size >= 2) {
        ws.send(
          JSON.stringify({
            type: "error",
            gameId,
            message: "Game room is full (maximum 2 players)",
          })
        );
        return;
      }

      console.log(`Player ${playerId} joining game ${gameId}`);
      room.players.set(playerId, { ws });
      room.gameState = addPlayer(room.gameState, playerId);

      this.broadcastToRoom(
        gameId,
        {
          type: "playerJoined",
          gameId,
          playerId,
        },
        ws
      );
    }

    ws.send(
      JSON.stringify({
        type: "gameState",
        gameId,
        gameState: room.gameState,
      })
    );

    this.broadcastToRoom(gameId, {
      type: "gameState",
      gameId,
      gameState: room.gameState,
    });
  }

  private handleStart(ws: any, gameId?: string, playerId?: string) {
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

    const startRoom = this.speedTypingRooms.get(gameId);
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

    if (startRoom.gameState.gameStatus !== "waiting") {
      ws.send(
        JSON.stringify({
          type: "error",
          gameId,
          message: "Game is already started or in progress",
        })
      );
      return;
    }

    console.log(`Starting countdown for game ${gameId}`);
    startRoom.gameState = startCountdown(startRoom.gameState);

    this.broadcastToRoom(gameId, {
      type: "countdown",
      gameId,
      gameState: startRoom.gameState,
    });

    let countdownValue = 3;
    startRoom.countdownInterval = setInterval(() => {
      countdownValue--;

      if (countdownValue > 0) {
        startRoom.gameState = {
          ...startRoom.gameState,
          countdownValue: countdownValue,
        };

        this.broadcastToRoom(gameId, {
          type: "countdown",
          gameId,
          gameState: startRoom.gameState,
        });
      } else {
        clearInterval(startRoom.countdownInterval);
        startRoom.countdownInterval = undefined;

        startRoom.gameState = updateCountdown(startRoom.gameState);
        console.log(`Game ${gameId} started!`);

        this.broadcastToRoom(gameId, {
          type: "gameState",
          gameId,
          gameState: startRoom.gameState,
        });
      }
    }, 1000);
  }

  private handleTyping(ws: any, message: SpeedTypingGameMessage) {
    const { gameId, playerId } = message;

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

    const typingRoom = this.speedTypingRooms.get(gameId);
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

    if (!typingRoom.gameState.players[playerId]) {
      ws.send(
        JSON.stringify({
          type: "error",
          gameId,
          message: "Player not found in game",
        })
      );
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

    this.broadcastToRoom(gameId, {
      type: "gameState",
      gameId,
      gameState: typingRoom.gameState,
    });

    if (typingRoom.gameState.gameStatus === "finished") {
      console.log(
        `Game ${gameId} finished! Winner: ${typingRoom.gameState.winner}`
      );
    }
  }

  private handleReset(ws: any, gameId?: string, playerId?: string) {
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

    const resetRoom = this.speedTypingRooms.get(gameId);
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

    this.broadcastToRoom(gameId, {
      type: "gameState",
      gameId,
      gameState: resetRoom.gameState,
    });
  }

  private handleDisconnection(ws: any) {
    console.log("Speed typing WebSocket connection closed");
    this.speedTypingRooms.forEach((room, gameId) => {
      room.players.forEach(({ ws: playerWs }, playerId) => {
        if (playerWs === ws) {
          console.log(`Player ${playerId} disconnected from game ${gameId}`);
          room.players.delete(playerId);
          room.gameState = removePlayer(room.gameState, playerId);

          if (room.countdownInterval) {
            clearInterval(room.countdownInterval);
            room.countdownInterval = undefined;
            console.log(
              `Cleared countdown for game ${gameId} due to player disconnect`
            );
          }

          this.broadcastToRoom(gameId, {
            type: "playerLeft",
            gameId,
            playerId,
          });

          if (room.players.size === 0) {
            console.log(`Deleting empty game room ${gameId}`);
            this.speedTypingRooms.delete(gameId);
          } else {
            this.broadcastToRoom(gameId, {
              type: "gameState",
              gameId,
              gameState: room.gameState,
            });
          }
        }
      });
    });
  }

  private broadcastToRoom(
    gameId: string,
    message: SpeedTypingGameMessage,
    excludeWs?: any
  ) {
    const room = this.speedTypingRooms.get(gameId);
    if (room) {
      room.players.forEach(({ ws }) => {
        if (ws.readyState === 1 && ws !== excludeWs) {
          ws.send(JSON.stringify(message));
        }
      });
    }
  }

  getActiveGamesCount(): number {
    return this.speedTypingRooms.size;
  }
}
