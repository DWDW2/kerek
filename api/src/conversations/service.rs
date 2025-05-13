use scylla::client::session::Session;
use crate::models::{
    conversation::{Conversation, NewConversation},
    message::{Message, NewMessage},
    user::User,
};
use crate::error::AppError;
use chrono::Utc;
use scylla::statement::prepared::PreparedStatement;
use uuid::Uuid;
use scylla::value::CqlTimestamp;
use actix_web::http::StatusCode;
use futures_util::stream::TryStreamExt;
use actix_web::web;
pub struct ConversationService {
    session: web::Data<Session>,
    create_conversation_stmt: PreparedStatement,
    get_conversation_stmt: PreparedStatement,
    list_conversations_stmt: PreparedStatement, 
    update_conversation_stmt: PreparedStatement,
    create_message_stmt: PreparedStatement,
    list_messages_stmt: PreparedStatement,
}

impl ConversationService {
    pub async fn new(session: web::Data<Session>) -> Result<Self, AppError> {
        let create_conversation_stmt = session
            .prepare("INSERT INTO conversations (id, name, is_group, created_at, updated_at, participant_ids) VALUES (?, ?, ?, ?, ?, ?)")
            .await.unwrap();
            
        let get_conversation_stmt = session
            .prepare("SELECT * FROM conversations WHERE id = ?")
            .await.unwrap();
            
        let list_conversations_stmt = session
            .prepare("SELECT * FROM conversations WHERE participant_ids CONTAINS ?")
            .await.unwrap();
            
        let update_conversation_stmt = session
            .prepare("UPDATE conversations SET name = ?, updated_at = ? WHERE id = ?")
            .await.unwrap();
            
        let create_message_stmt = session
            .prepare("INSERT INTO messages (id, conversation_id, sender_id, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
            .await.unwrap();
            
        let list_messages_stmt = session
            .prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ?")
            .await.unwrap();

        Ok(Self {
            session,
            create_conversation_stmt,
            get_conversation_stmt,
            list_conversations_stmt,
            update_conversation_stmt,
            create_message_stmt,
            list_messages_stmt,
        })
    }

    pub async fn create_conversation(
        &self,
        new_conversation: NewConversation,
        creator_id: String,
    ) -> Result<Conversation, AppError> {
        let now = Utc::now().timestamp();
        let id = Uuid::new_v4().to_string();
        
        let mut participant_ids = new_conversation.participant_ids;
        if !participant_ids.contains(&creator_id) {
            participant_ids.push(creator_id);
        }

        self.session
            .execute_unpaged(
                &self.create_conversation_stmt,
                (
                    id.clone(),
                    &new_conversation.name,
                    &new_conversation.is_group,
                    now,
                    now,
                    participant_ids,
                ),
            )
            .await.unwrap();

        Ok(Conversation {
            id,
            name: new_conversation.name,
            is_group: new_conversation.is_group,
            created_at: now,
            updated_at: now,
            last_message_at: None,
            participant_ids: vec!["24342".to_string(), "dfsf".to_string()],
        })
    }

    pub async fn get_conversation(&self, id: &str) -> Result<Conversation, AppError> {
        let mut iter = self.session
            .query_iter(
                "SELECT id, name, is_group, created_at, updated_at, last_message_at, participant_ids FROM conversations WHERE id = ?",
                (id,),
            )
            .await
            .map_err(|e| AppError(format!("Failed to prepare query: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?
            .rows_stream::<(Uuid, Option<String>, bool, CqlTimestamp, CqlTimestamp, Option<CqlTimestamp>, Vec<String>)>()
            .map_err(|e| AppError(format!("Failed to get rows stream: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;

        match iter.try_next().await {
            Ok(Some(row)) => {
                let (id, name, is_group, created_at, updated_at, last_message_at, participant_ids) = row;
                Ok(Conversation {
                    id: id.to_string(),
                    name,
                    is_group,
                    created_at: created_at.0,
                    updated_at: updated_at.0,
                    last_message_at: last_message_at.map(|ts| ts.0),
                    participant_ids,
                })
            }
            Ok(None) => Err(AppError("Conversation not found".into(), StatusCode::NOT_FOUND)),
            Err(e) => Err(AppError(format!("Failed to get conversation: {}", e), StatusCode::INTERNAL_SERVER_ERROR)),
        }
    }

    pub async fn list_conversations(&self, user_id: &str) -> Result<Vec<Conversation>, AppError> {
        let mut iter = self.session
            .query_iter(
                "SELECT id, name, is_group, created_at, updated_at, last_message_at, participant_ids FROM conversations WHERE participant_ids CONTAINS ?",
                (user_id,),
            )
            .await
            .map_err(|e| AppError(format!("Failed to prepare query: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?
            .rows_stream::<(Uuid, Option<String>, bool, CqlTimestamp, CqlTimestamp, Option<CqlTimestamp>, Vec<String>)>()
            .map_err(|e| AppError(format!("Failed to get rows stream: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;

        let mut conversations = Vec::new();
        while let Some(row) = iter.try_next().await.map_err(|e| AppError(format!("Failed to process conversation: {}", e), StatusCode::INTERNAL_SERVER_ERROR))? {
            let (id, name, is_group, created_at, updated_at, last_message_at, participant_ids) = row;
            conversations.push(Conversation {
                id: id.to_string(),
                name,
                is_group,
                created_at: created_at.0,
                updated_at: updated_at.0,
                last_message_at: last_message_at.map(|ts| ts.0),
                participant_ids,
            });
        }

        Ok(conversations)
    }

    pub async fn update_conversation(
        &self,
        id: &str,
        name: Option<String>,
    ) -> Result<Conversation, AppError> {
        let now = Utc::now().timestamp();
        
        self.session
            .query_unpaged(
                "UPDATE conversations SET name = ?, updated_at = ? WHERE id = ?",
                (name.clone(), CqlTimestamp(now), id),
            )
            .await
            .map_err(|e| AppError(format!("Failed to update conversation: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;

        self.get_conversation(id).await
    }

    pub async fn send_message(
        &self,
        conversation_id: &str,
        sender_id: &str,
        new_message: NewMessage,
    ) -> Result<Message, AppError> {
        let now = Utc::now().timestamp();
        let id = Uuid::new_v4();

        self.session
            .query_unpaged(
                "INSERT INTO messages (id, conversation_id, sender_id, content, created_at, updated_at, is_edited, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    id,
                    conversation_id,
                    sender_id,
                    new_message.content.clone(),
                    CqlTimestamp(now),
                    CqlTimestamp(now),
                    false,
                    false,
                ),
            )
            .await
            .map_err(|e| AppError(format!("Failed to send message: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;

        Ok(Message {
            id: id.to_string(),
            conversation_id: conversation_id.to_string(),
            sender_id: sender_id.to_string(),
            content: new_message.content,
            created_at: now,
            updated_at: now,
            is_edited: false,
            is_deleted: false,
        })
    }

    pub async fn list_messages(
        &self,
        conversation_id: &str,
        limit: i32,
    ) -> Result<Vec<Message>, AppError> {
        let mut iter = self.session
            .query_iter(
                "SELECT id, conversation_id, sender_id, content, created_at, updated_at, is_edited, is_deleted FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ?",
                (conversation_id, limit),
            )
            .await
            .map_err(|e| AppError(format!("Failed to prepare query: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?
            .rows_stream::<(Uuid, Uuid, Uuid, String, CqlTimestamp, CqlTimestamp, bool, bool)>()
            .map_err(|e| AppError(format!("Failed to get rows stream: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;

        let mut messages = Vec::new();
        while let Some(row) = iter.try_next().await.map_err(|e| AppError(format!("Failed to process message: {}", e), StatusCode::INTERNAL_SERVER_ERROR))? {
            let (id, conversation_id, sender_id, content, created_at, updated_at, is_edited, is_deleted) = row;
            messages.push(Message {
                id: id.to_string(),
                conversation_id: conversation_id.to_string(),
                sender_id: sender_id.to_string(),
                content,
                created_at: created_at.0,
                updated_at: updated_at.0,
                is_edited,
                is_deleted,
            });
        }

        Ok(messages)
    }
} 