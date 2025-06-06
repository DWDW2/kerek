export type Player = "X" | "O";
export type Cell = Player | null;
export type Board = Cell[];

export interface GameState {
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

export interface GameMessage {
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

export interface GameRoom {
  gameId: string;
  gameState: GameState;
  players: Map<string, { ws: any; player: Player | null }>;
}
