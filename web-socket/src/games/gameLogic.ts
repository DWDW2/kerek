import { Board, Player, GameState } from "./types";

export function createInitialGameState(gameId: string): GameState {
  return {
    board: Array(9).fill(null),
    currentPlayer: "X",
    winner: null,
    isDraw: false,
    gameId,
    players: {
      X: null,
      O: null,
    },
  };
}

export function checkWinner(board: Board): Player | null {
  const winningCombinations = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (const combination of winningCombinations) {
    const [a, b, c] = combination;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a] as Player;
    }
  }

  return null;
}

export function checkDraw(board: Board): boolean {
  return board.every((cell) => cell !== null) && !checkWinner(board);
}

export function isValidMove(board: Board, position: number): boolean {
  return position >= 0 && position < 9 && board[position] === null;
}

export function makeMove(
  gameState: GameState,
  position: number,
  player: Player
): GameState {
  if (
    !isValidMove(gameState.board, position) ||
    gameState.currentPlayer !== player ||
    gameState.winner
  ) {
    return gameState;
  }

  const newBoard = [...gameState.board];
  newBoard[position] = player;

  const winner = checkWinner(newBoard);
  const isDraw = !winner && checkDraw(newBoard);
  const currentPlayer =
    winner || isDraw ? gameState.currentPlayer : player === "X" ? "O" : "X";

  return {
    ...gameState,
    board: newBoard,
    currentPlayer,
    winner,
    isDraw,
  };
}

export function resetGame(gameState: GameState): GameState {
  return {
    ...gameState,
    board: Array(9).fill(null),
    currentPlayer: "X",
    winner: null,
    isDraw: false,
  };
}
