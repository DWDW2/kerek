# Game Server

A WebSocket-based game server for real-time multiplayer games in the messenger application.

## Features

- **Tic Tac Toe**: Classic 3x3 grid game for 2 players
- Real-time multiplayer gameplay via WebSocket
- Game room management
- Player reconnection support
- Game state synchronization

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Start the development server:

```bash
pnpm dev
```

The server will run on `http://localhost:3001` by default.

## Environment Variables

Create a `.env` file in the game directory:

```env
PORT=3001
```

## API Endpoints

- `GET /health` - Health check endpoint

## WebSocket Protocol

The game server uses WebSocket for real-time communication. Connect to `ws://localhost:3001`.

### Message Types

#### Join Game

```json
{
  "type": "join",
  "gameId": "conversation-id",
  "playerId": "user-id"
}
```

#### Make Move

```json
{
  "type": "move",
  "gameId": "conversation-id",
  "playerId": "user-id",
  "position": 0
}
```

#### Reset Game

```json
{
  "type": "reset",
  "gameId": "conversation-id",
  "playerId": "user-id"
}
```

### Server Responses

#### Game State

```json
{
  "type": "gameState",
  "gameId": "conversation-id",
  "gameState": {
    "board": [null, "X", "O", ...],
    "currentPlayer": "X",
    "winner": null,
    "isDraw": false,
    "players": {
      "X": "user-id-1",
      "O": "user-id-2"
    }
  }
}
```

#### Error

```json
{
  "type": "error",
  "gameId": "conversation-id",
  "message": "Error description"
}
```

## Game Logic

### Tic Tac Toe Rules

1. Two players take turns placing X and O on a 3x3 grid
2. First player to get 3 in a row (horizontal, vertical, or diagonal) wins
3. If all 9 squares are filled without a winner, it's a draw
4. Player X always goes first

### Game Flow

1. Players join a game room using the conversation ID
2. First player becomes X, second player becomes O
3. Players take turns making moves
4. Game state is synchronized across all connected clients
5. Game can be reset by any player

## Production Deployment

1. Build the project:

```bash
pnpm build
```

2. Start the production server:

```bash
pnpm start
```

## Frontend Integration

The frontend connects to the game server using the `NEXT_PUBLIC_GAME_WS_URL` environment variable:

```env
NEXT_PUBLIC_GAME_WS_URL=ws://localhost:3001
```

For production:

```env
NEXT_PUBLIC_GAME_WS_URL=wss://your-game-server-domain.com
```
