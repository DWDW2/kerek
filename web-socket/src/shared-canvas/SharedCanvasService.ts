import WebSocket from "ws";
import { BaseShape } from "./types";

interface Message {
  type: string;
}
interface JoinRoom extends Message {
  roomId: string;
  userId: string;
}
interface UpdateCanvas {
  type: string;
  roomId: string;
  userId: string;
  shapes: BaseShape[];
}
const rooms: Map<string, Map<string, any>> = new Map();
const user_shapes: Map<string, any> = new Map();
const connections: Map<string, WebSocket> = new Map()
export class SharedCanvasService {
  private ws: WebSocket;

  constructor(ws: WebSocket) {
    this.ws = ws;
  }

  async handleMessage() {
    this.ws.send(JSON.stringify({ type: "connected" }));
    this.ws.on("message", (data) => {
      console.log(data.toString());
      const response: Message = JSON.parse(data.toString());
      console.log(response);

      if (response.type === "join_room") {
        const message = response as JoinRoom;
        rooms.set(message.roomId, user_shapes.set(message.userId, undefined));
	connections.set(message.userId, this.ws) 
        this.ws.send(
          JSON.stringify({
            type: "room_joined",
            userCount: rooms.get(message.roomId)?.size,
          })
        );

	this.ws.on("message", (data) => {
		const message: UpdateCanvas = JSON.parse(data.toString());
		if (message.type === "canvas_update") {
			rooms.get(message.roomId)?.set(message.userId, [...message.shapes]);
			const room = rooms.get(message.roomId);
			if (room) {
				for (let key of room.keys()) {
					if(key !== message.userId){
						connections.get(key)?.send(JSON.stringify({
								type: "canvas_update",
								userId: message.userId,
								shapes: message.shapes
						}))
					}
				}
			}
		}
	});
      }
    });
  }
}
