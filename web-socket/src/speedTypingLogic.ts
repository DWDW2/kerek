import { SpeedTypingGameState } from "./speedTypingTypes";

const SAMPLE_TEXTS = [
  "The quick brown fox jumps over the lazy dog. This pangram contains every letter of the alphabet and is perfect for typing practice.",
  "Technology has revolutionized the way we communicate, work, and live. From smartphones to artificial intelligence, innovation continues to shape our future.",
  "The art of programming requires patience, logic, and creativity. Every line of code tells a story and solves a problem in the digital world.",
  "Nature's beauty can be found in the smallest details: dewdrops on spider webs, colorful autumn leaves, and the gentle sound of flowing streams.",
  "Success is not final, failure is not fatal: it is the courage to continue that counts. Every challenge is an opportunity to grow and learn.",
  "The ocean waves crashed against the rocky shore as seagulls soared overhead. The salty breeze carried the scent of adventure and endless possibilities.",
  "Music has the power to transport us to different worlds and evoke emotions we never knew existed. Every melody tells a story without words.",
  "Science is built upon curiosity and the desire to understand the world around us. Each discovery opens new doors to knowledge and possibility.",
  "Books are windows to countless worlds, each page offering new adventures and perspectives that broaden our understanding of life itself.",
  "Friendship is one of life's greatest treasures. True friends support each other through both joyful celebrations and challenging times ahead.",
];

export function createInitialSpeedTypingGameState(
  gameId: string
): SpeedTypingGameState {
  return {
    text: getRandomText(),
    players: {},
    gameId,
    isActive: false,
    gameStatus: "waiting",
  };
}

export function getRandomText(): string {
  return SAMPLE_TEXTS[Math.floor(Math.random() * SAMPLE_TEXTS.length)];
}

export function updatePlayerProgress(
  gameState: SpeedTypingGameState,
  playerId: string,
  progress: number,
  wpm: number,
  finished: boolean,
  finishTime?: number
): SpeedTypingGameState {
  const newGameState = { ...gameState };

  if (!newGameState.players[playerId]) {
    return gameState;
  }

  newGameState.players[playerId] = {
    ...newGameState.players[playerId],
    progress: Math.min(progress, 100),
    wpm,
    finished,
    finishTime,
  };

  if (finished && !newGameState.winner) {
    newGameState.winner = playerId;
    newGameState.gameStatus = "finished";
    newGameState.isActive = false;
  }

  return newGameState;
}

export function startGame(
  gameState: SpeedTypingGameState
): SpeedTypingGameState {
  return {
    ...gameState,
    gameStatus: "active",
    isActive: true,
    startTime: Date.now(),
  };
}

export function startCountdown(
  gameState: SpeedTypingGameState
): SpeedTypingGameState {
  return {
    ...gameState,
    gameStatus: "countdown",
    countdownValue: 3,
  };
}

export function updateCountdown(
  gameState: SpeedTypingGameState
): SpeedTypingGameState {
  const countdownValue = (gameState.countdownValue || 3) - 1;

  if (countdownValue <= 0) {
    return startGame(gameState);
  }

  return {
    ...gameState,
    countdownValue,
  };
}

export function resetSpeedTypingGame(
  gameState: SpeedTypingGameState
): SpeedTypingGameState {
  const newPlayers = { ...gameState.players };

  Object.keys(newPlayers).forEach((playerId) => {
    newPlayers[playerId] = {
      ...newPlayers[playerId],
      wpm: 0,
      progress: 0,
      finished: false,
      finishTime: undefined,
    };
  });

  return {
    ...gameState,
    text: getRandomText(),
    players: newPlayers,
    isActive: false,
    startTime: undefined,
    winner: undefined,
    gameStatus: "waiting",
    countdownValue: undefined,
  };
}

export function addPlayer(
  gameState: SpeedTypingGameState,
  playerId: string
): SpeedTypingGameState {
  if (gameState.players[playerId]) {
    return gameState;
  }

  return {
    ...gameState,
    players: {
      ...gameState.players,
      [playerId]: {
        id: playerId,
        wpm: 0,
        progress: 0,
        finished: false,
      },
    },
  };
}

export function removePlayer(
  gameState: SpeedTypingGameState,
  playerId: string
): SpeedTypingGameState {
  const newPlayers = { ...gameState.players };
  delete newPlayers[playerId];

  let newGameStatus = gameState.gameStatus;
  let isActive = gameState.isActive;

  if (gameState.isActive && Object.keys(newPlayers).length < 2) {
    newGameStatus = "waiting";
    isActive = false;
  }

  return {
    ...gameState,
    players: newPlayers,
    gameStatus: newGameStatus,
    isActive,
  };
}
