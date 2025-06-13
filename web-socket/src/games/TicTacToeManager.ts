import { GameRoom, GameMessage, Player } from "./types";
import { createInitialGameState, makeMove, resetGame } from "./gameLogic";

export class TicTacToeManager {
  private gameRooms = new Map<string, GameRoom>();

  handleConnection(ws: any) {
    console.log("Tic tac toe game connection established");

    ws.on("message", (data: any) => {
      try {
        const message: GameMessage = JSON.parse(data.toString());
        this.handleMessage(ws, message);
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
      this.handleDisconnection(ws);
    });
  }

  private handleMessage(ws: any, message: GameMessage) {
    const { type, gameId, playerId, position } = message;

    switch (type) {
      case "join":
        this.handleJoin(ws, gameId, playerId);
        break;
      case "move":
        this.handleMove(ws, gameId, playerId, position);
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

    let room = this.gameRooms.get(gameId);
    if (!room) {
      room = {
        gameId,
        gameState: createInitialGameState(gameId),
        players: new Map(),
      };
      this.gameRooms.set(gameId, room);
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

      const playerRole = this.assignPlayerRole(room);
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

      this.broadcastToRoom(gameId, {
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
  }

  private handleMove(
    ws: any,
    gameId?: string,
    playerId?: string,
    position?: number
  ) {
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

    const gameRoom = this.gameRooms.get(gameId);
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

    this.broadcastToRoom(gameId, {
      type: "gameState",
      gameId,
      gameState: newGameState,
    });

    console.log("newGameState", newGameState);
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

    const resetRoom = this.gameRooms.get(gameId);
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

    this.broadcastToRoom(gameId, {
      type: "gameState",
      gameId,
      gameState: resetRoom.gameState,
    });
  }

  private handleDisconnection(ws: any) {
    console.log("WebSocket connection closed");
    this.gameRooms.forEach((room, gameId) => {
      room.players.forEach((playerData, playerId) => {
        if (playerData.ws === ws) {
          room.players.delete(playerId);

          if (room.gameState.players.X === playerId) {
            room.gameState.players.X = null;
          }
          if (room.gameState.players.O === playerId) {
            room.gameState.players.O = null;
          }

          this.broadcastToRoom(gameId, {
            type: "playerLeft",
            gameId,
            playerId,
          });

          if (room.players.size === 0) {
            this.gameRooms.delete(gameId);
          }
        }
      });
    });
  }

  private assignPlayerRole(room: GameRoom): Player | null {
    if (!room.gameState.players.X) return "X";
    if (!room.gameState.players.O) return "O";
    return null;
  }

  private broadcastToRoom(gameId: string, message: GameMessage) {
    const room = this.gameRooms.get(gameId);
    if (room) {
      room.players.forEach(({ ws }) => {
        if (ws.readyState === 1) {
          ws.send(JSON.stringify(message));
        }
      });
    }
  }

  getActiveGamesCount(): number {
    return this.gameRooms.size;
  }
}
