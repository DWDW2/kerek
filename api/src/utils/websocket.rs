use actix_web::{rt, web, Error, HttpRequest, HttpResponse};
use actix_ws::AggregatedMessage;
use futures_util::StreamExt as _;
use scylla::client::session::Session;
use log::{info, error};
use actix_web::http::StatusCode;
use jsonwebtoken::{decode, DecodingKey, Validation};
use serde::Deserialize;
use std::env;
use std::collections::{HashMap, VecDeque};
use std::sync::Arc;
use tokio::sync::{RwLock, mpsc};
use crate::models::message::NewMessage;
use crate::utils::jwt::Claims;
use crate::error::AppError;
use crate::conversations::service as conversation_service;

pub struct RoomState {
    pub sender: Option<mpsc::UnboundedSender<String>>,
    pub pending_messages: VecDeque<String>,
}

pub type RoomStore = Arc<RwLock<HashMap<String, RoomState>>>;

#[derive(Deserialize, Debug)]
pub struct ConversationQuery {
    token: String,
}

pub async fn echo(
    req: HttpRequest,
    stream: web::Payload,
    path: web::Path<String>,
    query: web::Query<ConversationQuery>,
    dbsession: web::Data<Session>,
    room_store: web::Data<RoomStore>,
) -> Result<HttpResponse, Error> {
    let (res, mut session, stream) = actix_ws::handle(&req, stream)?;
    let token = query.token.clone();

    let secret = env::var("JWT_SECRET").unwrap_or_else(|_| "your-secret-key".to_string());
    let validation = Validation::default();

    let claims = decode::<Claims>(
        &token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &validation,
    )
    .map_err(|e| AppError(format!("Invalid token: {}", e), StatusCode::UNAUTHORIZED))?
    .claims;

    info!("claims: {:?}", claims);
    let mut stream = stream
        .aggregate_continuations()
        .max_continuation_size(2_usize.pow(20));

    let conversation_id = path.into_inner();
    info!("Starting WS connection for conversation_id: {}", conversation_id);
    let (tx, mut rx) = mpsc::unbounded_channel::<String>();

    let pending_messages = {
        let mut store = room_store.write().await;
        let room = store.entry(conversation_id.clone()).or_insert_with(|| RoomState {
            sender: None,
            pending_messages: VecDeque::new(),
        });
        if let Some(existing_tx) = &room.sender {
            let _ = existing_tx.send("Another user has joined your room!".to_string());
        }

        let mut pending = VecDeque::new();
        std::mem::swap(&mut pending, &mut room.pending_messages);

        room.sender = Some(tx);

        pending
    };

    for msg in pending_messages {
        if let Err(e) = session.text(msg).await {
            error!("Failed to send pending message: {}", e);
        }
    }


    let room_store = room_store.clone();
    rt::spawn(async move {
        loop {
            tokio::select! {
                Some(msg) = stream.next() => {
                    match msg {
                        Ok(AggregatedMessage::Text(text)) => {
                            info!("Received text message: {}", text);
                    
                            #[derive(Deserialize)]
                            struct IncomingMessage {
                                content: String,
                                conversationId: String,
                                senderId: String,
                            }
                            let conversation = conversation_service::ConversationService::new(dbsession.clone()).await.unwrap();
                        
                            let incoming: Result<IncomingMessage, _> = serde_json::from_str(&text);
                            match incoming {
                                Ok(msg) => {
                                    match conversation.send_message(
                                        &msg.conversationId,
                                        &msg.senderId,
                                        NewMessage {
                                            content: msg.content,
                                        },
                                    ).await {
                                        Ok(saved_msg) => {
                                            let response = serde_json::to_string(&saved_msg).unwrap();
                        
                                            let mut store = room_store.write().await;
                                            let room = store.entry(conversation_id.clone()).or_insert_with(|| RoomState {
                                                sender: None,
                                                pending_messages: VecDeque::new(),
                                            });
                        
                                            if let Some(other_tx) = &room.sender {
                                                if let Err(e) = other_tx.send(response.clone()) {
                                                    error!("Failed to send message to other user: {}", e);
                                                    room.pending_messages.push_back(response);
                                                }
                                            } else {
                                                room.pending_messages.push_back(response);
                                            }
                                        }
                                        Err(e) => {
                                            error!("Failed to save message: {}", e);
                                        }
                                    }
                                }
                                Err(e) => {
                                    error!("Failed to parse incoming message: {}", e);

                                }
                            }
                        }                                          
                        Ok(AggregatedMessage::Close(_)) => break,
                        Err(e) => {
                            error!("WebSocket error: {}", e);
                            break;
                        }
                        _ => {}
                    }
                }
                Some(server_msg) = rx.recv() => {
                    if let Err(e) = session.text(server_msg).await {
                        error!("Failed to send server message: {}", e);
                    }
                }
                else => break,
            }
        }

        info!("WebSocket connection closed for conversation_id: {}", conversation_id);
        let mut store = room_store.write().await;
        if let Some(room) = store.get_mut(&conversation_id) {
            room.sender = None;
            if room.pending_messages.is_empty() {
                store.remove(&conversation_id);
            }
        }
    });

    Ok(res)
}
