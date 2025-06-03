"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Keyboard, RotateCcw, Users, Trophy, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

interface Player {
  id: string;
  name?: string;
  wpm: number;
  progress: number;
  finished: boolean;
  finishTime?: number;
}

interface GameState {
  text: string;
  players: Record<string, Player>;
  gameId: string;
  isActive: boolean;
  startTime?: number;
  winner?: string;
  gameStatus: "waiting" | "countdown" | "active" | "finished";
  countdownValue?: number;
}

interface GameMessage {
  type:
    | "join"
    | "start"
    | "typing"
    | "reset"
    | "gameState"
    | "error"
    | "playerJoined"
    | "playerLeft"
    | "countdown";
  gameId: string;
  playerId?: string;
  progress?: number;
  wpm?: number;
  gameState?: GameState;
  message?: string;
  finished?: boolean;
  finishTime?: number;
}

interface SpeedTypingProps {
  conversationId: string;
}

const SAMPLE_TEXTS = [
  "The quick brown fox jumps over the lazy dog. This pangram contains every letter of the alphabet and is perfect for typing practice.",
  "Technology has revolutionized the way we communicate, work, and live. From smartphones to artificial intelligence, innovation continues to shape our future.",
  "The art of programming requires patience, logic, and creativity. Every line of code tells a story and solves a problem in the digital world.",
  "Nature's beauty can be found in the smallest details: dewdrops on spider webs, colorful autumn leaves, and the gentle sound of flowing streams.",
  "Success is not final, failure is not fatal: it is the courage to continue that counts. Every challenge is an opportunity to grow and learn.",
  "The ocean waves crashed against the rocky shore as seagulls soared overhead. The salty breeze carried the scent of adventure and endless possibilities.",
];

export function SpeedTyping({ conversationId }: SpeedTypingProps) {
  const { user } = useAuth();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [userInput, setUserInput] = useState("");
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("disconnected");
  const [errors, setErrors] = useState<boolean[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  const gameServerUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";

  const calculateWPM = useCallback(
    (progress: number, timeElapsed: number) => {
      if (!gameState || timeElapsed === 0) return 0;
      const wordsTyped = (gameState.text.length * progress) / 100 / 5;
      const minutes = timeElapsed / 60000;
      return Math.round(wordsTyped / minutes);
    },
    [gameState]
  );

  const updateTypingProgress = useCallback(() => {
    if (!gameState || !startTime || !user?.id) return;

    const currentTime = Date.now();
    const timeElapsed = currentTime - startTime;
    const progress = (currentCharIndex / gameState.text.length) * 100;
    const wpm = calculateWPM(progress, timeElapsed);

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "typing",
          gameId: conversationId,
          playerId: user.id,
          progress: Math.min(progress, 100),
          wpm,
          finished: progress >= 100,
          finishTime: progress >= 100 ? currentTime : undefined,
        })
      );
    }
  }, [
    gameState,
    startTime,
    currentCharIndex,
    user?.id,
    ws,
    conversationId,
    calculateWPM,
  ]);

  const connectToGame = useCallback(() => {
    if (!user?.id || !conversationId) return;

    setConnectionStatus("connecting");
    const websocket = new WebSocket(`${gameServerUrl}/ws/typing-game`);

    websocket.onopen = () => {
      console.log("Connected to speed typing game server");
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
              if (message.gameState.gameStatus === "active" && !startTime) {
                setStartTime(Date.now());
              }
            }
            break;

          case "countdown":
            toast.info(
              `Game starts in ${message.gameState?.countdownValue || 3}...`
            );
            break;

          case "playerJoined":
            toast.success("Player joined the game!");
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
      console.log("Disconnected from speed typing game server");
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
  }, [user?.id, conversationId, gameServerUrl, startTime]);

  useEffect(() => {
    const websocket = connectToGame();

    return () => {
      if (websocket) {
        websocket.close();
      }
    };
  }, [connectToGame]);

  useEffect(() => {
    updateTypingProgress();
  }, [currentCharIndex, updateTypingProgress]);

  const startGame = () => {
    if (!ws || !user?.id) return;

    ws.send(
      JSON.stringify({
        type: "start",
        gameId: conversationId,
        playerId: user.id,
      })
    );
  };

  const resetGame = () => {
    if (!ws || !user?.id) return;

    setUserInput("");
    setCurrentWordIndex(0);
    setCurrentCharIndex(0);
    setStartTime(null);
    setErrors([]);

    ws.send(
      JSON.stringify({
        type: "reset",
        gameId: conversationId,
        playerId: user.id,
      })
    );
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!gameState || gameState.gameStatus !== "active") return;

    const value = e.target.value;
    setUserInput(value);

    const words = gameState.text.split(" ");
    let charPosition = 0;

    for (let i = 0; i < currentWordIndex; i++) {
      charPosition += words[i].length + 1;
    }

    charPosition += value.length;
    setCurrentCharIndex(Math.min(charPosition, gameState.text.length));

    const currentWord = words[currentWordIndex] || "";
    const newErrors = [...errors];

    for (let i = 0; i < value.length; i++) {
      const expectedChar = currentWord[i];
      const actualChar = value[i];
      const errorIndex = charPosition - value.length + i;

      if (expectedChar !== actualChar) {
        newErrors[errorIndex] = true;
      } else {
        newErrors[errorIndex] = false;
      }
    }

    setErrors(newErrors);

    if (value.endsWith(" ") && value.trim() === currentWord) {
      setCurrentWordIndex((prev) => prev + 1);
      setUserInput("");
    }
  };

  const renderText = () => {
    if (!gameState) return null;

    const words = gameState.text.split(" ");
    let charIndex = 0;

    return (
      <div
        ref={textRef}
        className="text-lg font-mono leading-relaxed p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 min-h-[200px] whitespace-pre-wrap break-words"
      >
        {words.map((word, wordIndex) => {
          const wordStart = charIndex;
          const wordEnd = charIndex + word.length;

          const wordElement = (
            <span key={wordIndex} className="mr-2 inline-block">
              {word.split("").map((char, charIndexInWord) => {
                const globalCharIndex = wordStart + charIndexInWord;
                const isTyped = globalCharIndex < currentCharIndex;
                const isError = errors[globalCharIndex];
                const isCurrent = globalCharIndex === currentCharIndex;

                let className = "relative ";
                if (isCurrent) {
                  className += "bg-blue-500 text-white animate-pulse ";
                } else if (isTyped) {
                  className += isError
                    ? "bg-red-500 text-white "
                    : "bg-green-500 text-white ";
                } else {
                  className += "text-gray-400 ";
                }

                return (
                  <span key={charIndexInWord} className={className}>
                    {char}
                  </span>
                );
              })}
            </span>
          );

          charIndex = wordEnd + 1;
          return wordElement;
        })}
      </div>
    );
  };

  const getCurrentPlayer = () => {
    return gameState?.players[user?.id || ""];
  };

  const getOtherPlayers = () => {
    if (!gameState || !user?.id) return [];
    return Object.values(gameState.players).filter(
      (player) => player.id !== user.id
    );
  };

  const getGameStatus = () => {
    if (!gameState) return "Connecting...";

    switch (gameState.gameStatus) {
      case "waiting":
        return "Waiting for players...";
      case "countdown":
        return `Starting in ${gameState.countdownValue || 3}...`;
      case "active":
        return "Type as fast as you can!";
      case "finished":
        if (gameState.winner === user?.id) {
          return "🎉 You won!";
        } else if (gameState.winner) {
          return "😔 You lost!";
        } else {
          return "🏁 Game finished!";
        }
      default:
        return "Ready to play";
    }
  };

  const currentPlayer = getCurrentPlayer();
  const otherPlayers = getOtherPlayers();

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <Keyboard className="w-6 h-6" />
            Speed Typing Challenge
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

            <Badge className="bg-blue-500 text-white px-4 py-2">
              {getGameStatus()}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentPlayer && (
              <Card className="border-blue-500 border-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    You
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>WPM:</span>
                      <span className="font-bold text-blue-600">
                        {currentPlayer.wpm}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Progress:</span>
                      <span className="font-bold">
                        {currentPlayer.progress.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={currentPlayer.progress} className="h-2" />
                    {currentPlayer.finished && (
                      <Badge
                        variant="secondary"
                        className="w-full justify-center"
                      >
                        ✅ Finished!
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {otherPlayers.map((player) => (
              <Card key={player.id} className="border-gray-300">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Opponent
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>WPM:</span>
                      <span className="font-bold text-green-600">
                        {player.wpm}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Progress:</span>
                      <span className="font-bold">
                        {player.progress.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={player.progress} className="h-2" />
                    {player.finished && (
                      <Badge
                        variant="secondary"
                        className="w-full justify-center"
                      >
                        ✅ Finished!
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {gameState && renderText()}

          {gameState?.gameStatus === "active" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Type here:</label>
              <input
                ref={inputRef}
                type="text"
                value={userInput}
                onChange={handleInputChange}
                className="w-full p-3 text-lg font-mono border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="Start typing..."
                autoFocus
                disabled={gameState.gameStatus !== "active"}
              />
            </div>
          )}

          <div className="flex justify-center gap-4">
            {gameState?.gameStatus === "waiting" &&
              Object.keys(gameState.players).length >= 2 && (
                <Button
                  onClick={startGame}
                  disabled={!isConnected}
                  className="flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Start Game
                </Button>
              )}

            <Button
              onClick={resetGame}
              disabled={!isConnected}
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

          {gameState && Object.keys(gameState.players).length < 2 && (
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
