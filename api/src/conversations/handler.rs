use actix_web::{web, HttpResponse, Scope};
use crate::db::Session;
use crate::models::{
    conversation::{Conversation, NewConversation},
    message::{Message, NewMessage},
};
use crate::error::AppError;
use crate::middleware::auth::Claims;
use crate::conversations::service::ConversationService;

// Helper to get service from app data
async fn get_service(session: web::Data<Session>) -> Result<ConversationService, AppError> {
    ConversationService::new(session.get_ref().clone()).await
}

pub async fn list_conversations(
    session: web::Data<Session>,
    claims: web::ReqData<Claims>,
) -> Result<HttpResponse, AppError> {
    let service = get_service(session).await?;
    let conversations = service.list_conversations(&claims.sub).await?;
    Ok(HttpResponse::Ok().json(conversations))
}

pub async fn create_conversation(
    session: web::Data<Session>,
    claims: web::ReqData<Claims>,
    new_conversation: web::Json<NewConversation>,
) -> Result<HttpResponse, AppError> {
    let service = get_service(session).await?;
    let conversation = service
        .create_conversation(new_conversation.into_inner(), claims.sub.clone())
        .await?;
    Ok(HttpResponse::Created().json(conversation))
}

pub async fn get_conversation(
    session: web::Data<Session>,
    conversation_id: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let service = get_service(session).await?;
    let conversation = service.get_conversation(&conversation_id).await?;
    Ok(HttpResponse::Ok().json(conversation))
}

pub async fn update_conversation(
    session: web::Data<Session>,
    conversation_id: web::Path<String>,
    name: web::Json<Option<String>>,
) -> Result<HttpResponse, AppError> {
    let service = get_service(session).await?;
    let conversation = service
        .update_conversation(&conversation_id, name.into_inner())
        .await?;
    Ok(HttpResponse::Ok().json(conversation))
}

pub async fn list_messages(
    session: web::Data<Session>,
    conversation_id: web::Path<String>,
    query: web::Query<web::Json<Option<i32>>>,
) -> Result<HttpResponse, AppError> {
    let service = get_service(session).await?;
    let limit = query.into_inner().unwrap_or(50);
    let messages = service.list_messages(&conversation_id, limit).await?;
    Ok(HttpResponse::Ok().json(messages))
}

pub async fn send_message(
    session: web::Data<Session>,
    claims: web::ReqData<Claims>,
    conversation_id: web::Path<String>,
    new_message: web::Json<NewMessage>,
) -> Result<HttpResponse, AppError> {
    let service = get_service(session).await?;
    let message = service
        .send_message(&conversation_id, &claims.sub, new_message.into_inner())
        .await?;
    Ok(HttpResponse::Created().json(message))
} 