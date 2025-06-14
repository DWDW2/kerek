import WebSocket from "ws";
import {
  BaseShape,
  RectangleShape,
  CircleShape,
} from "./src/shared-canvas/types";

// Configuration
const WS_URL = "ws://localhost:3001/ws/shared-canvas";
const ROOM_ID = "test-room-123";

// Types for test messages
interface JoinRoom {
  type: "join_room";
  roomId: string;
  userId: string;
}

interface CanvasUpdate {
  type: "canvas_update";
  roomId: string;
  userId: string;
  shapes: BaseShape[];
}

interface CursorMove {
  type: "cursor_move";
  position: { x: number; y: number };
}

interface TestUser {
  id: string;
  username: string;
  email: string;
  token: string;
  color: string;
}

interface ClientStats {
  connected: boolean;
  authenticated: boolean;
  joinedRoom: boolean;
  messagesReceived: number;
  shapesCount: number;
}

// Mock user data
const users: TestUser[] = [
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

// Mock shapes for testing
const createMockRectangle = (
  userId: string,
  x = 100,
  y = 100
): RectangleShape => ({
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

const createMockCircle = (userId: string, x = 200, y = 200): CircleShape => ({
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
  private user: TestUser;
  private clientName: string;
  private ws: WebSocket | null = null;
  private isConnected = false;
  private isAuthenticated = false;
  private hasJoinedRoom = false;
  private receivedMessages: any[] = [];
  private shapes: BaseShape[] = [];

  constructor(user: TestUser, clientName: string) {
    this.user = user;
    this.clientName = clientName;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`[${this.clientName}] Connecting to ${WS_URL}...`);

      this.ws = new WebSocket(WS_URL);

      this.ws.on("open", () => {
        console.log(`[${this.clientName}] Connected successfully`);
        this.isConnected = true;
        resolve();
      });

      this.ws.on("message", (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          this.receivedMessages.push(message);
          this.handleMessage(message);
        } catch (error) {
          console.error(`[${this.clientName}] Error parsing message:`, error);
        }
      });

      this.ws.on("close", (code: number, reason: Buffer) => {
        console.log(
          `[${
            this.clientName
          }] Connection closed: ${code} - ${reason.toString()}`
        );
        this.isConnected = false;
        this.isAuthenticated = false;
        this.hasJoinedRoom = false;
      });

      this.ws.on("error", (error: Error) => {
        console.error(`[${this.clientName}] WebSocket error:`, error);
        reject(error);
      });
    });
  }

  private handleMessage(message: any): void {
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
        console.log(
          `[${this.clientName}] 🔧 Shape updated:`,
          message.shape?.id
        );
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

      case "user_selection_changed":
        console.log(
          `[${this.clientName}] 🎯 User selection changed by ${message.userId}:`,
          message.selectedShapeIds
        );
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

  private joinRoom(): void {
    const message: JoinRoom = {
      type: "join_room",
      roomId: ROOM_ID,
      userId: this.user.id,
    };

    console.log(`[${this.clientName}] 📤 Joining room ${ROOM_ID}...`);
    this.send(message);
  }

  sendCanvasUpdate(shapes: BaseShape[]): void {
    if (!this.hasJoinedRoom) {
      console.log(
        `[${this.clientName}] ⚠️ Cannot send canvas update - not in room yet`
      );
      return;
    }

    const message: CanvasUpdate = {
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

  sendCursorMove(position: { x: number; y: number }): void {
    if (!this.hasJoinedRoom) return;

    const message: CursorMove = {
      type: "cursor_move",
      userId: this.user.id,
      position,
    };

    this.send(message);
  }

  sendUserSelection(selectedShapeIds: string[]): void {
    if (!this.hasJoinedRoom) return;

    const message = {
      type: "user_selection",
      userId: this.user.id,
      selectedShapeIds,
    };

    console.log(`[${this.clientName}] 📤 Sending user selection...`);
    this.send(message);
  }

  sendShapeUpdate(shape: BaseShape): void {
    if (!this.hasJoinedRoom) return;

    const message = {
      type: "shape_update",
      roomId: ROOM_ID,
      userId: this.user.id,
      shape,
    };

    console.log(`[${this.clientName}] 📤 Sending shape update...`);
    this.send(message);
  }

  sendShapeDelete(shapeId: string): void {
    if (!this.hasJoinedRoom) return;

    const message = {
      type: "shape_delete",
      roomId: ROOM_ID,
      userId: this.user.id,
      shapeId,
    };

    console.log(`[${this.clientName}] 📤 Deleting shape...`);
    this.send(message);
  }

  private send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error(
        `[${this.clientName}] ❌ Cannot send message - WebSocket not open`
      );
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
    }
  }

  getStats(): ClientStats {
    return {
      connected: this.isConnected,
      authenticated: this.isAuthenticated,
      joinedRoom: this.hasJoinedRoom,
      messagesReceived: this.receivedMessages.length,
      shapesCount: this.shapes.length,
    };
  }
}

// Test scenarios
async function runTests(): Promise<void> {
  console.log("🚀 Starting Shared Canvas WebSocket Tests...\n");

  // Create test clients
  const client1 = new CanvasTestClient(users[0], "Client1");
  const client2 = new CanvasTestClient(users[1], "Client2");

  try {
    // Test 1: Connection and Authentication
    console.log("📝 Test 1: Connection and Authentication");
    await client1.connect();
    await client2.connect();

    // Wait for authentication flow
    await sleep(2000);

    console.log("\n📊 Connection Status:");
    console.log("Client1:", client1.getStats());
    console.log("Client2:", client2.getStats());

    // Test 2: Canvas Updates
    console.log("\n📝 Test 2: Canvas Shape Updates");

    // Client 1 adds a rectangle
    const rect = createMockRectangle(users[0].id, 50, 50);
    await sleep(1000);
    client1.sendCanvasUpdate([rect]);

    // Wait for propagation
    await sleep(1000);

    // Client 2 adds a circle
    const circle = createMockCircle(users[1].id, 200, 200);
    await sleep(1000);
    client2.sendCanvasUpdate([rect, circle]); // Include existing shapes

    // Wait for propagation
    await sleep(1000);

    // Test 3: Cursor Movement
    console.log("\n📝 Test 3: Cursor Movement");
    client1.sendCursorMove({ x: 100, y: 150 });
    client2.sendCursorMove({ x: 250, y: 300 });

    await sleep(1000);

    // Test 4: User Selection
    console.log("\n📝 Test 4: User Selection");
    client1.sendUserSelection([rect.id]);
    client2.sendUserSelection([circle.id]);

    await sleep(1000);

    // Test 5: Shape Updates
    console.log("\n📝 Test 5: Shape Updates");
    const updatedRect = { ...rect, x: 75, y: 75 };
    client1.sendShapeUpdate(updatedRect);

    await sleep(1000);

    // Test 6: Shape Deletion
    console.log("\n📝 Test 6: Shape Deletion");
    client2.sendShapeDelete(circle.id);

    await sleep(1000);

    // Test 7: Multiple Shape Updates
    console.log("\n📝 Test 7: Multiple Shape Updates");
    const shapes: BaseShape[] = [
      updatedRect,
      createMockRectangle(users[0].id, 300, 100),
      createMockCircle(users[1].id, 400, 150),
    ];

    client1.sendCanvasUpdate(shapes);
    await sleep(1000);

    // Final Statistics
    console.log("\n📊 Final Test Results:");
    console.log("Client1 Stats:", client1.getStats());
    console.log("Client2 Stats:", client2.getStats());

    console.log("\n✅ All tests completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    // Cleanup
    console.log("\n🧹 Cleaning up connections...");
    client1.disconnect();
    client2.disconnect();
  }
}

// Utility function for delays
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

export { CanvasTestClient, runTests };
