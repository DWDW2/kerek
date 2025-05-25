"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Circle, RotateCcw, Users, Trophy, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

type Player = "X" | "O";
type Cell = Player | null;
type Board = Cell[];

interface GameState {
  board: Board;
  currentPlayer: Player;
  winner: Player | null;
  isDraw: boolean;
  gameId: string;
  players: {
    X: string | null;
    O: string | null;
  };
}

interface GameMessage {
  type:
    | "join"
    | "move"
    | "reset"
    | "gameState"
    | "error"
    | "playerJoined"
    | "playerLeft";
  gameId: string;
  playerId?: string;
  position?: number;
  gameState?: GameState;
  message?: string;
  player?: Player;
}

interface TicTacToeProps {
  conversationId: string;
}

export function TicTacToe({ conversationId }: TicTacToeProps) {
  const { user } = useAuth();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myPlayer, setMyPlayer] = useState<Player | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("disconnected");

  const gameServerUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";

  const connectToGame = useCallback(() => {
    if (!user?.id || !conversationId) return;

    setConnectionStatus("connecting");
    const websocket = new WebSocket(`${gameServerUrl}/ws/game`);

    websocket.onopen = () => {
      console.log("Connected to game server");
      setIsConnected(true);
      setConnectionStatus("connected");
      setWs(websocket);

      websocket.send(
        JSON.stringify({
          type: "join",
          gameId: conversationId,
          playerId: user.id,
        })
      );
    };

    websocket.onmessage = (event) => {
      try {
        const message: GameMessage = JSON.parse(event.data);

        switch (message.type) {
          case "gameState":
            if (message.gameState) {
              setGameState(message.gameState);

              if (message.gameState.players.X === user.id) {
                setMyPlayer("X");
              } else if (message.gameState.players.O === user.id) {
                setMyPlayer("O");
              }
            }
            break;

          case "playerJoined":
            toast.success(`Player ${message.player} joined the game!`);
            break;

          case "playerLeft":
            toast.info("A player left the game");
            break;

          case "error":
            toast.error(message.message || "Game error occurred");
            break;
        }
      } catch (error) {
        console.error("Error parsing game message:", error);
      }
    };

    websocket.onclose = () => {
      console.log("Disconnected from game server");
      setIsConnected(false);
      setConnectionStatus("disconnected");
      setWs(null);
    };

    websocket.onerror = (error) => {
      console.error("WebSocket error:", error);
      setConnectionStatus("disconnected");
      toast.error("Failed to connect to game server");
    };

    return websocket;
  }, [user?.id, conversationId, gameServerUrl]);

  useEffect(() => {
    const websocket = connectToGame();

    return () => {
      if (websocket) {
        websocket.close();
      }
    };
  }, [connectToGame]);

  const makeMove = (position: number) => {
    if (!ws || !user?.id || !gameState || !myPlayer) return;

    if (gameState.currentPlayer !== myPlayer) {
      toast.warning("It's not your turn!");
      return;
    }

    if (gameState.board[position] !== null) {
      toast.warning("This cell is already taken!");
      return;
    }

    if (gameState.winner || gameState.isDraw) {
      toast.warning("Game is already finished!");
      return;
    }

    ws.send(
      JSON.stringify({
        type: "move",
        gameId: conversationId,
        playerId: user.id,
        position,
      })
    );
  };

  const resetGame = () => {
    if (!ws || !user?.id) return;

    ws.send(
      JSON.stringify({
        type: "reset",
        gameId: conversationId,
        playerId: user.id,
      })
    );
  };

  const renderCell = (index: number) => {
    const cell = gameState?.board[index];
    const isWinningCell = false;

    return (
      <button
        key={index}
        onClick={() => makeMove(index)}
        disabled={
          !isConnected ||
          !gameState ||
          gameState.winner !== null ||
          gameState.isDraw ||
          gameState.currentPlayer !== myPlayer
        }
        className={`
          aspect-square w-full h-20 sm:h-24 md:h-28 lg:h-32
          border-2 border-gray-300 dark:border-gray-600
          bg-white dark:bg-gray-800
          hover:bg-gray-50 dark:hover:bg-gray-700
          disabled:cursor-not-allowed
          transition-all duration-200
          flex items-center justify-center
          text-4xl sm:text-5xl md:text-6xl font-bold
          ${isWinningCell ? "bg-green-100 dark:bg-green-900" : ""}
          ${
            gameState?.currentPlayer === myPlayer &&
            !gameState.winner &&
            !gameState.isDraw
              ? "hover:shadow-lg"
              : ""
          }
        `}
      >
        {cell === "X" && (
          <X className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-blue-600" />
        )}
        {cell === "O" && (
          <Circle className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-red-600" />
        )}
      </button>
    );
  };

  const getGameStatus = () => {
    if (!gameState) return "Connecting...";

    if (gameState.winner) {
      if (gameState.winner === myPlayer) {
        return "🎉 You won!";
      } else {
        return "😔 You lost!";
      }
    }

    if (gameState.isDraw) {
      return "🤝 It's a draw!";
    }

    if (gameState.currentPlayer === myPlayer) {
      return "🎯 Your turn";
    } else {
      return "⏳ Opponent's turn";
    }
  };

  const getStatusColor = () => {
    if (!gameState) return "bg-gray-500";

    if (gameState.winner === myPlayer) return "bg-green-500";
    if (gameState.winner && gameState.winner !== myPlayer) return "bg-red-500";
    if (gameState.isDraw) return "bg-yellow-500";
    if (gameState.currentPlayer === myPlayer) return "bg-blue-500";
    return "bg-orange-500";
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <Trophy className="w-6 h-6" />
            Tic Tac Toe
          </CardTitle>

          <div className="flex items-center justify-center gap-4 mt-4">
            <Badge
              variant={
                connectionStatus === "connected" ? "default" : "destructive"
              }
            >
              {connectionStatus === "connected" && (
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
              )}
              {connectionStatus}
            </Badge>

            {myPlayer && (
              <Badge variant="outline" className="flex items-center gap-1">
                You are:{" "}
                {myPlayer === "X" ? (
                  <X className="w-4 h-4" />
                ) : (
                  <Circle className="w-4 h-4" />
                )}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="text-center">
            <Badge
              className={`${getStatusColor()} text-white px-4 py-2 text-lg`}
            >
              {getGameStatus()}
            </Badge>
          </div>

          <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <X className="w-5 h-5 text-blue-600" />
              <span className="font-medium">
                {gameState?.players.X ? "Player X" : "Waiting..."}
              </span>
              {gameState?.players.X === user?.id && (
                <Badge variant="secondary">You</Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Circle className="w-5 h-5 text-red-600" />
              <span className="font-medium">
                {gameState?.players.O ? "Player O" : "Waiting..."}
              </span>
              {gameState?.players.O === user?.id && (
                <Badge variant="secondary">You</Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 max-w-md mx-auto">
            {Array.from({ length: 9 }, (_, index) => renderCell(index))}
          </div>

          <div className="flex justify-center gap-4">
            <Button
              onClick={resetGame}
              disabled={!isConnected || !gameState}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              New Game
            </Button>

            {connectionStatus === "disconnected" && (
              <Button
                onClick={connectToGame}
                className="flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                Reconnect
              </Button>
            )}
          </div>

          {gameState && (!gameState.players.X || !gameState.players.O) && (
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Clock className="w-6 h-6 mx-auto mb-2 text-blue-600" />
              <p className="text-blue-700 dark:text-blue-300">
                Waiting for another player to join...
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                Share this conversation to invite someone to play!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
