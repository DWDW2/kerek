const WebSocket = require("ws");

const WS_URL = "ws://localhost:3001/ws/shared-canvas";
const ROOM_ID = "test-room-123";

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

const createMockRectangle = (userId, x = 100, y = 100) => ({
  id: `rect-${userId}-${Date.now()}`,
  type: "rectangle",
  x,
  y,
  width: 150,
  height: 100,
  fill: "transparent",
  stroke: "#000000",
  strokeWidth: 2,
  opacity: 1,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  visible: true,
  draggable: true,
  timestamp: Date.now(),
  userId,
  cornerRadius: 0,
});

const createMockCircle = (userId, x = 200, y = 200) => ({
  id: `circle-${userId}-${Date.now()}`,
  type: "circle",
  x,
  y,
  radius: 50,
  fill: "transparent",
  stroke: "#FF0000",
  strokeWidth: 2,
  opacity: 1,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  visible: true,
  draggable: true,
  timestamp: Date.now(),
  userId,
});

class CanvasTestClient {
  constructor(user, clientName) {
    this.user = user;
    this.clientName = clientName;
    this.ws = null;
    this.isConnected = false;
    this.isAuthenticated = false;
    this.hasJoinedRoom = false;
    this.receivedMessages = [];
    this.shapes = [];
  }

  connect() {
    return new Promise((resolve, reject) => {
      console.log(`[${this.clientName}] Connecting to ${WS_URL}...`);

      this.ws = new WebSocket(WS_URL);

      this.ws.on("open", () => {
        console.log(`[${this.clientName}] Connected successfully`);
        this.isConnected = true;
        resolve();
      });

      this.ws.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.receivedMessages.push(message);
          this.handleMessage(message);
        } catch (error) {
          console.error(`[${this.clientName}] Error parsing message:`, error);
        }
      });

      this.ws.on("close", (code, reason) => {
        console.log(
          `[${this.clientName}] Connection closed: ${code} - ${reason}`
        );
        this.isConnected = false;
        this.isAuthenticated = false;
        this.hasJoinedRoom = false;
      });

      this.ws.on("error", (error) => {
        console.error(`[${this.clientName}] WebSocket error:`, error);
        reject(error);
      });
    });
  }

  handleMessage(message) {
    console.log(`[${this.clientName}] Received:`, message.type, message);

    switch (message.type) {
      case "connected":
        console.log(`[${this.clientName}] ✅ Connection established`);
        this.isAuthenticated = true;
        this.joinRoom();
        break;

      case "room_joined":
        console.log(
          `[${this.clientName}] ✅ Joined room with ${message.userCount} users`
        );
        this.hasJoinedRoom = true;
        if (message.shapes) {
          this.shapes = [...message.shapes];
        }
        break;

      case "canvas_update":
        console.log(
          `[${this.clientName}] 📝 Canvas update from user ${message.userId}`
        );
        if (message.userId !== this.user.id) {
          console.log(
            `[${this.clientName}] 🔄 Received ${
              message.shapes?.length || 0
            } shapes from remote user`
          );
          if (message.shapes) {
            this.shapes = [...message.shapes];
          }
        }
        break;

      case "canvas_updated":
        console.log(
          `[${this.clientName}] 🎨 Canvas updated by ${message.updatedBy}`
        );
        if (message.updatedBy !== this.user.id && message.shapes) {
          this.shapes = [...message.shapes];
        }
        break;

      case "shape_updated":
        console.log(`[${this.clientName}] 🔧 Shape updated:`, message.shape.id);
        break;

      case "shape_deleted":
        console.log(`[${this.clientName}] 🗑️ Shape deleted:`, message.shapeId);
        break;

      case "cursor_moved":
        if (message.userId !== this.user.id) {
          console.log(
            `[${this.clientName}] 👆 Cursor moved by ${message.userId}:`,
            message.position
          );
        }
        break;

      case "user_joined":
        console.log(
          `[${this.clientName}] 👋 User joined:`,
          message.user?.userId
        );
        break;

      case "user_left":
        console.log(`[${this.clientName}] 👋 User left:`, message.userId);
        break;

      case "error":
        console.error(`[${this.clientName}] ❌ Error:`, message.message);
        break;

      default:
        console.log(
          `[${this.clientName}] ❓ Unknown message type:`,
          message.type
        );
    }
  }

  joinRoom() {
    const message = {
      type: "join_room",
      roomId: ROOM_ID,
      userId: this.user.id,
    };

    console.log(`[${this.clientName}] 📤 Joining room ${ROOM_ID}...`);
    this.send(message);
  }

  sendCanvasUpdate(shapes) {
    if (!this.hasJoinedRoom) {
      console.log(
        `[${this.clientName}] ⚠️ Cannot send canvas update - not in room yet`
      );
      return;
    }

    const message = {
      type: "canvas_update",
      roomId: ROOM_ID,
      userId: this.user.id,
      shapes: shapes,
    };

    console.log(
      `[${this.clientName}] 📤 Sending canvas update with ${shapes.length} shapes...`
    );
    this.send(message);
    this.shapes = [...shapes];
  }

  sendCursorMove(position) {
    if (!this.hasJoinedRoom) return;

    const message = {
      type: "cursor_move",
      position,
    };

    this.send(message);
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error(
        `[${this.clientName}] ❌ Cannot send message - WebSocket not open`
      );
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }

  getStats() {
    return {
      connected: this.isConnected,
      authenticated: this.isAuthenticated,
      joinedRoom: this.hasJoinedRoom,
      messagesReceived: this.receivedMessages.length,
      shapesCount: this.shapes.length,
    };
  }
}

async function runTests() {
  console.log("🚀 Starting Shared Canvas WebSocket Tests...\n");

  const client1 = new CanvasTestClient(users[0], "Client1");
  const client2 = new CanvasTestClient(users[1], "Client2");

  try {
    console.log("📝 Test 1: Connection and Authentication");
    await client1.connect();
    await client2.connect();

    await sleep(2000);

    console.log("\n📊 Connection Status:");
    console.log("Client1:", client1.getStats());
    console.log("Client2:", client2.getStats());

    console.log("\n📝 Test 2: Canvas Shape Updates");

    const rect = createMockRectangle(users[0].id, 50, 50);
    await sleep(1000);
    client1.sendCanvasUpdate([rect]);

    await sleep(1000);

    const circle = createMockCircle(users[1].id, 200, 200);
    await sleep(1000);
    client2.sendCanvasUpdate([rect, circle]);

    await sleep(1000);

    console.log("\n📝 Test 3: Cursor Movement");
    client1.sendCursorMove({ x: 100, y: 150 });
    client2.sendCursorMove({ x: 250, y: 300 });

    await sleep(1000);

    console.log("\n📝 Test 4: Multiple Shape Updates");
    const shapes = [
      rect,
      circle,
      createMockRectangle(users[0].id, 300, 100),
      createMockCircle(users[1].id, 400, 150),
    ];

    client1.sendCanvasUpdate(shapes);
    await sleep(1000);

    console.log("\n📊 Final Test Results:");
    console.log("Client1 Stats:", client1.getStats());
    console.log("Client2 Stats:", client2.getStats());

    console.log("\n✅ All tests completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    console.log("\n🧹 Cleaning up connections...");
    client1.disconnect();
    client2.disconnect();
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { CanvasTestClient, runTests };
