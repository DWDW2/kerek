use actix_web::{web, HttpResponse, HttpRequest};
use scylla::client::session::Session;
use crate::models::{
    conversation::{ NewConversation, ConversationCustomization},
    message::{NewMessage},
};
use crate::error::AppError;
use crate::conversations::service::ConversationService;
use serde::{Serialize, Deserialize};
use actix_web::http::StatusCode;
use crate::utils::jwt::get_user_id_from_token;
use actix_multipart::Multipart;
use futures_util::StreamExt as _;
use aws_sdk_s3 as s3;
use aws_smithy_types::date_time::Format::DateTime;



#[derive(Debug, Serialize, Deserialize)]
pub struct ListMessagesRequest {
    pub limit: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ListMessagesQuery {
    pub limit: Option<i32>,
}


pub async fn list_conversations(
    session: web::Data<Session>,
    req: HttpRequest,
) -> Result<HttpResponse, AppError> {
    let user_id = get_user_id_from_token(&req)?;
    let service = ConversationService::new(session).await?;
    let conversations = service.list_conversations(&user_id).await?;
    Ok(HttpResponse::Ok().json(conversations))
}

pub async fn create_conversation(
    session: web::Data<Session>,
    req: HttpRequest,
    new_conversation: web::Json<NewConversation>,
) -> Result<HttpResponse, AppError> {
    let user_id = get_user_id_from_token(&req)?;
    let service = ConversationService::new(session).await?;
    let conversation = service
        .create_conversation(new_conversation.into_inner(), user_id)
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
    req: HttpRequest,
    conversation_id: web::Path<String>,
    name: web::Json<Option<String>>,
) -> Result<HttpResponse, AppError> {
    let user_id = get_user_id_from_token(&req)?;
    let service = ConversationService::new(session).await?;
    
    let conversation = service.get_conversation(&conversation_id).await?;
    if !conversation.participant_ids.contains(&user_id) {
        return Err(AppError("Not authorized to update this conversation".to_string(), StatusCode::FORBIDDEN));
    }

    let conversation = service
        .update_conversation(&conversation_id, name.into_inner())
        .await?;
    Ok(HttpResponse::Ok().json(conversation))
}

pub async fn list_messages(
    session: web::Data<Session>,
    req: HttpRequest,
    conversation_id: web::Path<String>,
    query: web::Query<ListMessagesQuery>,
) -> Result<HttpResponse, AppError> {
    let user_id = get_user_id_from_token(&req)?;
    let service = ConversationService::new(session).await?;
    
    let conversation = service.get_conversation(&conversation_id).await?;
    if !conversation.participant_ids.contains(&user_id) {
        return Err(AppError("Not authorized to view messages in this conversation".to_string(), StatusCode::FORBIDDEN));
    }

    let limit = query.limit.unwrap_or(50);
    let messages = service.list_messages(&conversation_id, limit).await?;
    Ok(HttpResponse::Ok().json(messages))
}

pub async fn send_message(
    session: web::Data<Session>,
    req: HttpRequest,
    conversation_id: web::Path<String>,
    new_message: web::Json<NewMessage>,
) -> Result<HttpResponse, AppError> {
    let user_id = get_user_id_from_token(&req)?;
    let service = ConversationService::new(session).await?;
    
    let conversation = service.get_conversation(&conversation_id).await?;
    if !conversation.participant_ids.contains(&user_id) {
        return Err(AppError("Not authorized to send messages in this conversation".to_string(), StatusCode::FORBIDDEN));
    }

    let message = service
        .send_message(&conversation_id, &user_id, new_message.into_inner())
        .await?;
    Ok(HttpResponse::Created().json(message))
}

pub async fn update_conversation_customization(
    session: web::Data<Session>,
    req: HttpRequest,
    conversation_id: web::Path<String>,
    customization: web::Json<ConversationCustomization>,
    s3_client: web::Data<s3::Client>,
    mut multipart: Multipart,
) -> Result<HttpResponse, AppError> {
    let user_id = get_user_id_from_token(&req)?;
    let service = ConversationService::new(session).await?;

    let conversation = service.get_conversation(&conversation_id).await?;
    
    if !conversation.participant_ids.contains(&user_id) {
        return Err(AppError("Not authorized to update this conversation".to_string(), StatusCode::FORBIDDEN));
    }

    let conversation = service.update_conversation_customization(&conversation_id, customization.into_inner(), multipart, s3_client).await?;
    Ok(HttpResponse::Ok().json(conversation))
}

