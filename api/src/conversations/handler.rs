use actix_web::{web, HttpResponse, Scope};
use scylla::client::session::Session;
use crate::models::{
    conversation::{Conversation, NewConversation},
    message::{Message, NewMessage},
};
use crate::error::AppError;
use crate::conversations::service::ConversationService;
use serde::{Serialize, Deserialize};
#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,  
    pub exp: i64,      
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ListMessagesRequest {
    pub limit: Option<i32>,
}

pub async fn list_conversations(
    session: web::Data<Session>,
    claims: web::Json<Claims>,
) -> Result<HttpResponse, AppError> {
    let service = ConversationService::new(session).await?;
    let conversations = service.list_conversations(&claims.sub).await?;
    Ok(HttpResponse::Ok().json(conversations))
}

pub async fn create_conversation(
    session: web::Data<Session>,
    claims: web::Json<Claims>,
    new_conversation: web::Json<NewConversation>,
) -> Result<HttpResponse, AppError> {
    let service = ConversationService::new(session).await?;
    let conversation = service
        .create_conversation(new_conversation.into_inner(), claims.sub.clone())
        .await?;
    Ok(HttpResponse::Created().json(conversation))
}

pub async fn get_conversation(
    session: web::Data<Session>,
    conversation_id: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let service = ConversationService::new(session).await?;
    let conversation = service.get_conversation(&conversation_id).await?;
    Ok(HttpResponse::Ok().json(conversation))
}

pub async fn update_conversation(
    session: web::Data<Session>,
    conversation_id: web::Path<String>,
    name: web::Json<Option<String>>,
) -> Result<HttpResponse, AppError> {
    let service = ConversationService::new(session).await?;
    let conversation = service
        .update_conversation(&conversation_id, name.into_inner())
        .await?;
    Ok(HttpResponse::Ok().json(conversation))
}

pub async fn list_messages(
    session: web::Data<Session>,
    conversation_id: web::Path<String>,
    request: web::Json<ListMessagesRequest>,
) -> Result<HttpResponse, AppError> {
    let service = ConversationService::new(session).await?;
    let limit = request.limit.unwrap_or(50);
    let messages = service.list_messages(&conversation_id, limit).await?;
    Ok(HttpResponse::Ok().json(messages))
}

pub async fn send_message(
    session: web::Data<Session>,
    claims: web::Json<Claims>,
    conversation_id: web::Path<String>,
    new_message: web::Json<NewMessage>,
) -> Result<HttpResponse, AppError> {
    let service = ConversationService::new(session).await?;
    let message = service
        .send_message(&conversation_id, &claims.sub, new_message.into_inner())
        .await?;
    Ok(HttpResponse::Created().json(message))
}