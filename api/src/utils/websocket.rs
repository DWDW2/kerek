use actix_web::{rt, web, Error, HttpRequest, HttpResponse};
use actix_ws::Message;
use futures_util::StreamExt as _;
use scylla::client::session::Session;
use log::{info, error, warn, debug};
use actix_web::http::StatusCode;
use jsonwebtoken::{decode, DecodingKey, Validation};
use scylla::SerializeRow;
use serde::{Deserialize, Serialize};
use std::env;
use std::collections::{HashMap, VecDeque};
use std::sync::Arc;
use tokio::sync::{RwLock, mpsc};
use crate::models::message::NewMessage;
use crate::models::group::NewGroupMessage;
use crate::models::user::User;
use crate::utils::jwt::Claims;
use crate::error::AppError;
use crate::utils::db_client::DbClient;
use crate::conversations::service as conversation_service;
use crate::groups::service as group_service;

pub struct RoomState {
    pub senders: HashMap<String, Vec<mpsc::UnboundedSender<String>>>,
    pub pending_messages: HashMap<String, VecDeque<String>>,     
}

pub type RoomStore = Arc<RwLock<HashMap<String, RoomState>>>;

#[derive(Deserialize, Debug)]
pub struct ConversationQuery {
    token: String,
}

#[derive(Deserialize, Debug)]
pub struct GroupQuery {
    token: String,
}

#[derive(Deserialize, Debug)]
pub struct OnlineQuery {
    user_id: String,
}

pub async fn echo(
    req: HttpRequest,
    stream: web::Payload,
    path: web::Path<String>,
    query: web::Query<ConversationQuery>,
    dbsession: web::Data<Session>,
    room_store: web::Data<RoomStore>,
) -> Result<HttpResponse, Error> {
    info!("WebSocket handshake initiated for path: {:?}", path);

    let (res, mut session, mut stream) = actix_ws::handle(&req, stream)?;
    info!("WebSocket handshake successful.");

    let token: String = query.token.clone();
    debug!("Received token: {}", token);

    let secret: String = env::var("JWT_SECRET").unwrap_or_else(|_| "your-secret-key".to_string());
    let validation: Validation = Validation::default();

    let claims = match decode::<Claims>(
        &token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &validation,
    ) {
        Ok(data) => {
            info!("JWT decoded successfully: {:?}", data.claims);
            data.claims
        }
        Err(e) => {
            error!("Invalid token: {}", e);
            return Err(AppError(format!("Invalid token: {}", e), StatusCode::UNAUTHORIZED).into());
        }
    };

    let user_id = claims.sub.clone();
    let conversation_id = path.into_inner();
    info!("User {} is attempting to connect to conversation {}", user_id, conversation_id);

    let conversation_service = match conversation_service::ConversationService::new(dbsession.clone()).await {
        Ok(service) => service,
        Err(e) => {
            error!("Failed to create conversation service: {}", e);
            return Err(e.into());
        }
    };

    let conversation = match conversation_service.get_conversation(&conversation_id).await {
        Ok(conv) => conv,
        Err(e) => {
            error!("Failed to fetch conversation {}: {}", conversation_id, e);
            return Err(e.into());
        }
    };

    if !conversation.participant_ids.contains(&user_id) {
        warn!("User {} is not a participant of conversation {}. Closing connection.", user_id, conversation_id);
        return Ok(HttpResponse::Unauthorized().finish());
    }

    let (tx, mut rx) = mpsc::unbounded_channel::<String>();
    info!("Channel created for user {} in conversation {}", user_id, conversation_id);

    let mut store = room_store.write().await;
    let room = store.entry(conversation_id.clone()).or_insert_with(|| {
        info!("Creating new RoomState for conversation {}", conversation_id);
        RoomState {
            senders: HashMap::new(),
            pending_messages: HashMap::new(),
        }
    });

    room.senders.entry(user_id.clone()).or_default().push(tx);
    info!("User {} added to senders for conversation {}", user_id, conversation_id);

    let mut pending = room.pending_messages.remove(&user_id).unwrap_or_default();
    if !pending.is_empty() {
        info!("Delivering {} pending messages to user {} in conversation {}", pending.len(), user_id, conversation_id);
    }
    drop(store);

    for msg in pending.drain(..) {
        debug!("Sending pending message to user {}: {}", user_id, msg);
        if let Err(e) = session.text(msg).await {
            error!("Failed to send pending message to user {}: {}", user_id, e);
        }
    }

    let participant_ids = conversation.participant_ids.clone();
    let user_id_clone = user_id.clone();
    let conversation_id_clone = conversation_id.clone();

    info!("WebSocket event loop starting for user {} in conversation {}", user_id, conversation_id);

    rt::spawn(async move {
        let user_id = user_id_clone;
        let conversation_id = conversation_id_clone;
        
        loop {
            tokio::select! {
                Some(msg) = stream.next() => {
                    match msg {
                        Ok(Message::Text(text)) => {
                            info!("Received message from user {}: {}", user_id, text);

                            #[derive(Deserialize, Debug)]
                            struct IncomingMessage {
                                content: String,
                                conversationId: String,
                                senderId: String,
                            }
                            let incoming: Result<IncomingMessage, _> = serde_json::from_str(&text);
                            match incoming {
                                Ok(msg) => {
                                    info!("Parsed incoming message from user {}: {:?}", user_id, msg);
                                    let conversation_service = match conversation_service::ConversationService::new(dbsession.clone()).await {
                                        Ok(service) => service,
                                        Err(e) => {
                                            error!("Failed to create conversation service: {}", e);
                                            continue;
                                        }
                                    };
                                    match conversation_service.send_message(
                                        &msg.conversationId,
                                        &msg.senderId,
                                        NewMessage { content: msg.content.clone() }
                                    ).await {
                                        Ok(saved_msg) => {
                                            info!("Message from user {} saved to DB: {:?}", user_id, saved_msg);
                                            let response = match serde_json::to_string(&saved_msg) {
                                                Ok(resp) => resp,
                                                Err(e) => {
                                                    error!("Failed to serialize saved message: {}", e);
                                                    continue;
                                                }
                                            };

                                            let mut store = room_store.write().await;
                                            if let Some(room) = store.get_mut(&conversation_id) {
                                                for pid in &participant_ids {
                                                    if pid == &user_id {
                                                        debug!("Skipping echo to sender user {}.", user_id);
                                                        continue;
                                                    }
                                                    if let Some(other_txs) = room.senders.get(pid) {
                                                        debug!("Sending message to connected user {}: {}", pid, response);
                                                        let mut all_failed = true;
                                                        for tx in other_txs {
                                                            if let Err(e) = tx.send(response.clone()) {
                                                                error!("Failed to send message to user {} on one connection: {}", pid, e);
                                                            } else {
                                                                all_failed = false;
                                                            }
                                                        }
                                                        if all_failed {
                                                            error!("All connections failed for user {}. Queuing for later.", pid);
                                                            room.pending_messages.entry(pid.clone())
                                                                .or_default()
                                                                .push_back(response.clone());
                                                        }
                                                    } else {
                                                        debug!("User {} not connected. Queuing message.", pid);
                                                        room.pending_messages.entry(pid.clone())
                                                            .or_default()
                                                            .push_back(response.clone());
                                                    }
                                                }
                                            } else {
                                                warn!("RoomState for conversation {} not found while sending message.", conversation_id);
                                            }
                                        }
                                        Err(e) => {
                                            error!("Failed to save message from user {}: {}", user_id, e);
                                        }
                                    }
                                }
                                Err(e) => {
                                    error!("Failed to parse incoming message from user {}: {}", user_id, e);
                                }
                            }
                        }
                        Ok(Message::Close(reason)) => {
                            info!("WebSocket closed by user {} in conversation {}: {:?}", user_id, conversation_id, reason);
                            break;
                        }
                        Err(e) => {
                            error!("WebSocket error for user {} in conversation {}: {}", user_id, conversation_id, e);
                            break;
                        }
                        _ => {
                            debug!("Received non-text message from user {} in conversation {}", user_id, conversation_id);
                        }
                    }
                }

                Some(server_msg) = rx.recv() => {
                    debug!("Sending server message to user {}: {}", user_id, server_msg);
                    if let Err(e) = session.text(server_msg).await {
                        error!("Failed to send server message to user {}: {}", user_id, e);
                    }
                }
                else => {
                    info!("WebSocket event loop ending for user {} in conversation {}", user_id, conversation_id);
                    break;
                }
            }
        }

        let mut store = room_store.write().await;
        if let Some(room) = store.get_mut(&conversation_id) {
            info!("Cleaning up user {} from conversation {}", user_id, conversation_id);
            room.senders.remove(&user_id);
            if room.senders.is_empty() && room.pending_messages.is_empty() {
                info!("No more users in conversation {}. Removing RoomState.", conversation_id);
                store.remove(&conversation_id);
            }
        } else {
            warn!("RoomState for conversation {} not found during cleanup.", conversation_id);
        }
    });

    info!("WebSocket handler setup complete for user {} in conversation {}", user_id, conversation_id);

    Ok(res)
}

pub async fn group_echo(
    req: HttpRequest,
    stream: web::Payload,
    path: web::Path<String>,
    query: web::Query<GroupQuery>,
    dbsession: web::Data<Session>,
    room_store: web::Data<RoomStore>,
) -> Result<HttpResponse, Error> {
    info!("Group WebSocket handshake initiated for path: {:?}", path);

    let (res, mut session, mut stream) = actix_ws::handle(&req, stream)?;
    info!("Group WebSocket handshake successful.");

    let token: String = query.token.clone();
    debug!("Received token: {}", token);

    let secret: String = env::var("JWT_SECRET").unwrap_or_else(|_| "your-secret-key".to_string());
    let validation: Validation = Validation::default();

    let claims = match decode::<Claims>(
        &token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &validation,
    ) {
        Ok(data) => {
            info!("JWT decoded successfully: {:?}", data.claims);
            data.claims
        }
        Err(e) => {
            error!("Invalid token: {}", e);
            return Err(AppError(format!("Invalid token: {}", e), StatusCode::UNAUTHORIZED).into());
        }
    };

    let user_id = claims.sub.clone();
    let group_id = path.into_inner();
    info!("User {} is attempting to connect to group {}", user_id, group_id);

    let group_service = match group_service::GroupService::new(dbsession.clone()).await {
        Ok(service) => service,
        Err(e) => {
            error!("Failed to create group service: {}", e);
            return Err(e.into());
        }
    };

    let group = match group_service.get_group(&group_id).await {
        Ok(group) => group,
        Err(e) => {
            error!("Failed to fetch group {}: {}", group_id, e);
            return Err(e.into());
        }
    };

    if !group.member_ids.contains(&user_id) {
        warn!("User {} is not a member of group {}. Closing connection.", user_id, group_id);
        return Ok(HttpResponse::Unauthorized().finish());
    }

    let (tx, mut rx) = mpsc::unbounded_channel::<String>();
    info!("Channel created for user {} in group {}", user_id, group_id);

    let mut store = room_store.write().await;
    let room = store.entry(group_id.clone()).or_insert_with(|| {
        info!("Creating new RoomState for group {}", group_id);
        RoomState {
            senders: HashMap::new(),
            pending_messages: HashMap::new(),
        }
    });

    room.senders.entry(user_id.clone()).or_default().push(tx);
    info!("User {} added to senders for group {}", user_id, group_id);

    let mut pending = room.pending_messages.remove(&user_id).unwrap_or_default();
    if !pending.is_empty() {
        info!("Delivering {} pending messages to user {} in group {}", pending.len(), user_id, group_id);
    }
    drop(store);

    for msg in pending.drain(..) {
        debug!("Sending pending message to user {}: {}", user_id, msg);
        if let Err(e) = session.text(msg).await {
            error!("Failed to send pending message to user {}: {}", user_id, e);
        }
    }

    let member_ids = group.member_ids.clone();
    let user_id_clone = user_id.clone();
    let group_id_clone = group_id.clone();

    info!("Group WebSocket event loop starting for user {} in group {}", user_id, group_id);

    rt::spawn(async move {
        let user_id = user_id_clone;
        let group_id = group_id_clone;
        
        loop {
            tokio::select! {
                Some(msg) = stream.next() => {
                    match msg {
                        Ok(Message::Text(text)) => {
                            info!("Received group message from user {}: {}", user_id, text);

                            #[derive(Deserialize, Debug)]
                            struct IncomingMessage {
                                content: String,
                                groupId: String,
                                senderId: String,
                            }
                            let incoming: Result<IncomingMessage, _> = serde_json::from_str(&text);
                            match incoming {
                                Ok(msg) => {
                                    info!("Parsed incoming group message from user {}: {:?}", user_id, msg);
                                    let group_service = match group_service::GroupService::new(dbsession.clone()).await {
                                        Ok(service) => service,
                                        Err(e) => {
                                            error!("Failed to create group service: {}", e);
                                            continue;
                                        }
                                    };
                                    match group_service.send_message(
                                        &msg.groupId,
                                        &msg.senderId,
                                        NewGroupMessage { content: msg.content.clone() }
                                    ).await {
                                        Ok(saved_msg) => {
                                            info!("Group message from user {} saved to DB: {:?}", user_id, saved_msg);
                                            let response = match serde_json::to_string(&saved_msg) {
                                                Ok(resp) => resp,
                                                Err(e) => {
                                                    error!("Failed to serialize saved group message: {}", e);
                                                    continue;
                                                }
                                            };

                                            let mut store = room_store.write().await;
                                            if let Some(room) = store.get_mut(&group_id) {
                                                for member_id in &member_ids {
                                                    if member_id == &user_id {
                                                        debug!("Skipping echo to sender user {}.", user_id);
                                                        continue;
                                                    }
                                                    if let Some(other_txs) = room.senders.get(member_id) {
                                                        debug!("Sending group message to connected user {}: {}", member_id, response);
                                                        let mut all_failed = true;
                                                        for tx in other_txs {
                                                            if let Err(e) = tx.send(response.clone()) {
                                                                error!("Failed to send group message to user {} on one connection: {}", member_id, e);
                                                            } else {
                                                                all_failed = false;
                                                            }
                                                        }
                                                        if all_failed {
                                                            error!("All connections failed for user {}. Queuing for later.", member_id);
                                                            room.pending_messages.entry(member_id.clone())
                                                                .or_default()
                                                                .push_back(response.clone());
                                                        }
                                                    } else {
                                                        debug!("User {} not connected. Queuing group message.", member_id);
                                                        room.pending_messages.entry(member_id.clone())
                                                            .or_default()
                                                            .push_back(response.clone());
                                                    }
                                                }
                                            } else {
                                                warn!("RoomState for group {} not found while sending message.", group_id);
                                            }
                                        }
                                        Err(e) => {
                                            error!("Failed to save group message from user {}: {}", user_id, e);
                                        }
                                    }
                                }
                                Err(e) => {
                                    error!("Failed to parse incoming group message from user {}: {}", user_id, e);
                                }
                            }
                        }
                        Ok(Message::Close(reason)) => {
                            info!("Group WebSocket closed by user {} in group {}: {:?}", user_id, group_id, reason);
                            break;
                        }
                        Err(e) => {
                            error!("Group WebSocket error for user {} in group {}: {}", user_id, group_id, e);
                            break;
                        }
                        _ => {
                            debug!("Received non-text message from user {} in group {}", user_id, group_id);
                        }
                    }
                }

                Some(server_msg) = rx.recv() => {
                    debug!("Sending server message to user {} in group: {}", user_id, server_msg);
                    if let Err(e) = session.text(server_msg).await {
                        error!("Failed to send server message to user {} in group: {}", user_id, e);
                    }
                }
                else => {
                    info!("Group WebSocket event loop ending for user {} in group {}", user_id, group_id);
                    break;
                }
            }
        }

        let mut store = room_store.write().await;
        if let Some(room) = store.get_mut(&group_id) {
            info!("Cleaning up user {} from group {}", user_id, group_id);
            room.senders.remove(&user_id);
            if room.senders.is_empty() && room.pending_messages.is_empty() {
                info!("No more users in group {}. Removing RoomState.", group_id);
                store.remove(&group_id);
            }
        } else {
            warn!("RoomState for group {} not found during cleanup.", group_id);
        }
    });

    info!("Group WebSocket handler setup complete for user {} in group {}", user_id, group_id);

    Ok(res)
}

#[derive(Deserialize,SerializeRow, Debug, Serialize)]
pub struct UserOnline {
    user_id: String,
    online: bool,
}

pub async fn online(
    req: HttpRequest,
    stream: web::Payload,
    query: web::Query<OnlineQuery>,
    dbsession: web::Data<Session>,
    room_store: web::Data<RoomStore>,
) -> Result<HttpResponse, Error> {
    let (res, mut session, mut stream) = actix_ws::handle(&req, stream)?;
    let db_client = DbClient::<UserOnline> { 
        session: &dbsession, 
        _phantom: std::marker::PhantomData
    };

   tokio::select! {
        Some(msg) = stream.next() => {
            match msg {
                Ok(Message::Text(text)) => {
                    let user_online = UserOnline {
                        user_id: query.user_id.clone(),
                        online: true,
                    };
                    db_client.insert("UPDATE users SET online = ? WHERE id = ?", (user_online.online, user_online.user_id)).await;
                    Ok(HttpResponse::Ok().finish())
                }
                Err(e) => {
                    error!("WebSocket error: {}", e);
                    return Err(e.into());
                }
                _ => {
                    debug!("Received non-text message from user {}", query.user_id);
                    return Err(AppError("Invalid message".to_string(), StatusCode::BAD_REQUEST).into());
                }
            }
        }
   }
}