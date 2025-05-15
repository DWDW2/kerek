use actix_web::{rt, web, App, Error, HttpRequest, HttpResponse, HttpServer};
use actix_ws::AggregatedMessage;
use futures_util::StreamExt as _;
use crate::conversations::service as conversation_service;
use scylla::client::session::Session;
use log::{info, error};
use crate::error::AppError;
use actix_web::http::StatusCode;
use jsonwebtoken::{decode, DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use std::env;
use crate::utils::jwt::Claims;

use std::collections::HashSet;
use std::sync::Arc;
use tokio::sync::RwLock;

pub type ConversationStore = Arc<RwLock<HashSet<String>>>;


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
    conversation_store: web::Data<ConversationStore>,
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
    {
        let mut store = conversation_store.write().await;
        store.insert(conversation_id.clone());
    }
    let conversation = conversation_service::ConversationService::new(dbsession).await?;

    rt::spawn(async move {
        while let Some(msg) = stream.next().await {
            match msg {
                Ok(AggregatedMessage::Text(text)) => {
                    info!("Received text message: {}", text);
                    if let Err(e) = session.text("Hello from server".to_string()).await {
                        error!("Failed to send text message: {}", e);
                    }
                }

                Ok(AggregatedMessage::Binary(bin)) => {
                    info!("Received binary message of length: {}", bin.len());
                    if let Err(e) = session.binary(bin).await {
                        error!("Failed to send binary message: {}", e);
                    }
                }

                Ok(AggregatedMessage::Ping(msg)) => {
                    info!("Received ping message");
                    if let Err(e) = session.pong(&msg).await {
                        error!("Failed to send pong: {}", e);
                    }
                }

                Ok(AggregatedMessage::Pong(_)) => {
                    info!("Received pong message");
                }

                Ok(AggregatedMessage::Close(reason)) => {
                    info!("Received close message: {:?}", reason);
                }

                Err(e) => {
                    error!("WebSocket error: {}", e);
                    break;
                }

                _ => {
                    info!("Received unknown message");
                }
            }
        }

        info!("WebSocket connection closed for conversation_id: {}", conversation_id);
    });

    Ok(res)
}

