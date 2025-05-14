use actix_web::{web, HttpRequest, HttpResponse, Error};
use actix::Addr;
use actix_web_actors::ws;
use std::time::Instant;
use crate::websocket::server;
use crate::websocket::session;

pub async fn chat_route(
    req: HttpRequest,
    stream: web::Payload,
    srv: web::Data<Addr<server::ChatServer>>,
) -> Result<HttpResponse, Error> {
    ws::start(
        session::WsChatSession {
            id: 0,
            hb: Instant::now(),
            room: "main".to_owned(),
            name: None,
            addr: srv.get_ref().clone(),
        },
        &req,
        stream,
    )
}