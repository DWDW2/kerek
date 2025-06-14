# Shared Canvas WebSocket Test Scripts

This directory contains test scripts to validate the WebSocket functionality for the shared canvas feature.

## Overview

The test scripts simulate two users connecting to the shared canvas WebSocket server, authenticating, joining a room, and exchanging canvas updates to ensure the real-time collaboration works correctly.

## Files

- `test-shared-canvas.js` - JavaScript version of the test script
- `test-shared-canvas.ts` - TypeScript version with proper typing
- `TEST_CANVAS.md` - This documentation file

## Test Coverage

The scripts test the following scenarios:

1. **Connection & Room Joining Flow**

   - WebSocket connection establishment
   - Direct room joining without authentication

2. **Canvas Shape Updates**

   - Creating and sharing rectangle shapes
   - Creating and sharing circle shapes
   - Propagation of shapes between users

3. **Cursor Movement**

   - Real-time cursor position sharing
   - Cross-user cursor visibility

4. **Multi-Shape Operations**
   - Managing multiple shapes simultaneously
   - Canvas state synchronization

## Prerequisites

1. Ensure the WebSocket server is running:

   ```bash
   pnpm run dev
   ```

2. The server should be accessible at `ws://localhost:3001/ws/shared-canvas`

## Running the Tests

### JavaScript Version

```bash
# Using npm script
pnpm run test:canvas

# Or directly
node test-shared-canvas.js
```

### TypeScript Version

```bash
# Using npm script
pnpm run test:canvas:ts

# Or directly (requires ts-node)
ts-node test-shared-canvas.ts
```

## Expected Output

When the tests run successfully, you should see output similar to:

```
🚀 Starting Shared Canvas WebSocket Tests...

📝 Test 1: Connection and Room Joining
[Client1] Connecting to ws://localhost:3001/ws/shared-canvas...
[Client2] Connecting to ws://localhost:3001/ws/shared-canvas...
[Client1] Connected successfully
[Client2] Connected successfully
[Client1] Received: connected {...}
[Client2] Received: connected {...}
  [Client1] ✅ Connection established
  [Client2] ✅ Connection established
  [Client1] 📤 Joining room test-room-123...
  [Client2] 📤 Joining room test-room-123...

📊 Connection Status:
Client1: { connected: true, authenticated: true, joinedRoom: true, messagesReceived: 2, shapesCount: 0 }
Client2: { connected: true, authenticated: true, joinedRoom: true, messagesReceived: 2, shapesCount: 0 }

📝 Test 2: Canvas Shape Updates
[Client1] 📤 Sending canvas update with 1 shapes...
[Client2] 📝 Canvas update from user user-1
[Client2] 🔄 Received 1 shapes from remote user
[Client2] 📤 Sending canvas update with 2 shapes...
[Client1] 📝 Canvas update from user user-2
[Client1] 🔄 Received 2 shapes from remote user

📝 Test 3: Cursor Movement
[Client2] 👆 Cursor moved by user-1: { x: 100, y: 150 }
[Client1] 👆 Cursor moved by user-2: { x: 250, y: 300 }

📝 Test 4: Multiple Shape Updates
[Client1] 📤 Sending canvas update with 4 shapes...
[Client2] 📝 Canvas update from user user-1
[Client2] 🔄 Received 4 shapes from remote user

📊 Final Test Results:
Client1 Stats: { connected: true, authenticated: true, joinedRoom: true, messagesReceived: 5, shapesCount: 4 }
Client2 Stats: { connected: true, authenticated: true, joinedRoom: true, messagesReceived: 6, shapesCount: 4 }

✅ All tests completed successfully!

🧹 Cleaning up connections...
```

## Configuration

You can modify the following constants in the test files:

- `WS_URL`: WebSocket server URL (default: `ws://localhost:3001/ws/shared-canvas`)
- `ROOM_ID`: Test room identifier (default: `test-room-123`)
- Mock user data and shape properties

## Mock Data

The scripts use mock user data:

```javascript
const users = [
  {
    id: "user-1",
    username: "Alice",
    email: "alice@example.com",
    token: "token-alice-123",
    color: "#FF6B6B",
  },
  {
    id: "user-2",
    username: "Bob",
    email: "bob@example.com",
    token: "token-bob-456",
    color: "#4ECDC4",
  },
];
```

## Troubleshooting

### Connection Issues

- Ensure the WebSocket server is running on port 3001
- Check that the `/ws/shared-canvas` endpoint is available
- Verify no firewall blocking the connection

### Connection Issues

- Check server logs for any connection errors

### Message Flow Issues

- Enable verbose logging by modifying the `handleMessage` method
- Check for message type mismatches between client and server

## Integration with Frontend

The test scripts follow the same message protocol as the frontend React component (`shared-canvas.tsx`):

- Same message types and structure
- Direct room joining without authentication
- Same shape data format
- Same room management logic

## Contributing

When modifying the WebSocket protocol:

1. Update the test scripts to match new message types
2. Update the mock data to match new shape properties
3. Add new test scenarios for new features
4. Update this documentation

## Related Files

- `src/shared-canvas/SharedCanvasService.ts` - Server-side WebSocket handler
- `src/shared-canvas/types.ts` - Type definitions for shapes and messages
- `frontend/src/components/shared-canvas/shared-canvas.tsx` - Frontend implementation
