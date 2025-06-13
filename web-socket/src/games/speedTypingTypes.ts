import { WebSocket } from "ws";

export interface SpeedTypingPlayer {
  id: string;
  name?: string;
  wpm: number;
  progress: number;
  finished: boolean;
  finishTime?: number;
}

export interface SpeedTypingGameState {
  text: string;
  players: Record<string, SpeedTypingPlayer>;
  gameId: string;
  isActive: boolean;
  startTime?: number;
  winner?: string;
  gameStatus: "waiting" | "countdown" | "active" | "finished";
  countdownValue?: number;
}

export interface SpeedTypingGameMessage {
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
  gameState?: SpeedTypingGameState;
  message?: string;
  finished?: boolean;
  finishTime?: number;
}

export interface SpeedTypingGameRoom {
  gameId: string;
  gameState: SpeedTypingGameState;
  players: Map<string, { ws: WebSocket }>;
  countdownInterval?: NodeJS.Timeout;
}
