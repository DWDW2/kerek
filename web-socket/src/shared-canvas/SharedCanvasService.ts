import WebSocket from "ws";
interface Message {
	type: string;
}


export class SharedCanvasService {

	private ws: WebSocket; 


	constructor(ws: WebSocket){
		this.ws = ws;
	}
		


	async handleMessage() {
		this.ws.on('message', (data) => {
			this.ws.send("server")
		})

	}
}
