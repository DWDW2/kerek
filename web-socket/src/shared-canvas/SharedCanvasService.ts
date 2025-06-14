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
const connections: Map<string, WebSocket> = new Map();
export class SharedCanvasService {
  private ws: WebSocket;

  constructor(ws: WebSocket) {
    this.ws = ws;
  }

  async handleMessage(ws: WebSocket) {
    this.ws.send(JSON.stringify({ type: "connected" }));
    this.ws.on("message", (data) => {
      console.log(data.toString());
      const response: Message = JSON.parse(data.toString());
      console.log(response);
      if (response.type === "user_info") {
        this.ws.send(
          JSON.stringify({
            type: "user_authenticated",
          })
        );
        this.ws.on("message", (data) => {
          const message: JoinRoom = JSON.parse(data.toString());
	  connections.set(message.userId, ws);
          if (message.type === "join_room") {
            rooms.set(
              message.roomId,
              user_shapes.set(message.userId, undefined)
            );
            this.ws.send(
              JSON.stringify({
                type: "room_joined",
                userCount: rooms.get(message.roomId)?.size,
              })
            );

            this.ws.on("message", (data) => {
              const message: UpdateCanvas = JSON.parse(data.toString());
              if (message.type === "canvas_update") {
                rooms
                  .get(message.roomId)
                  ?.set(message.userId, [...message.shapes]);
              
		  const room = rooms.get(message.roomId);

		  const user = room?.get(message.userId);

		  for(let key in room?.keys()) {
			  if(key !== user){
				  connections.get(key)?.send(JSON.stringify({
					  type: "canvas_update",
					  userId: message.userId,
					  shapes: message.shapes
				  }));

			}

		  }

	      } 
            });
          }
        });
      }
    });
  }
}
