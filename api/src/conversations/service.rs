use scylla::client::session::Session;
use crate::{models::{
    conversation::{Conversation, NewConversation},
    message::{Message, NewMessage},
    user::User,
}, utils::one_to_one::one_to_one_key};
use crate::error::AppError;
use chrono::Utc;
use uuid::{NoContext, Timestamp, Uuid};
use scylla::value::CqlTimestamp;
use actix_web::http::StatusCode;
use futures_util::stream::TryStreamExt;
use actix_web::web;
use scylla::statement::Statement;
use std::time::{SystemTime, UNIX_EPOCH};
use scylla::value::CqlTimeuuid;
pub struct ConversationService {
    session: web::Data<Session>,
}

impl ConversationService {
    pub async fn new(session: web::Data<Session>) -> Result<Self, AppError> {
        Ok(Self { session })
    }

    pub async fn create_conversation(
        &self,
        new_conversation: NewConversation,
        creator_id: String,
    ) -> Result<Conversation, AppError> {
        let now = Utc::now().timestamp();
        let is_group = new_conversation.participant_ids.len() > 2;
    
        let one_to_one_key = if !is_group {
            Some(one_to_one_key(
                &creator_id,
                &new_conversation.participant_ids
                    .iter()
                    .find(|id| *id != &creator_id)
                    .ok_or_else(|| AppError("No other participant".to_string(), StatusCode::BAD_REQUEST))?,
            ))
        } else {
            None
        };
    
        if let Some(ref key) = one_to_one_key {
            let stmt = Statement::new(
                "SELECT conversation_id FROM one_to_one_conversations WHERE one_to_one_key = ?"
            );
            let mut rows = self.session.query_iter(stmt, (key,))
                .await
                .map_err(|e| AppError(format!("Failed to query one-to-one conversation: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?
                .rows_stream::<(Uuid,)>()
                .map_err(|e| AppError(format!("Failed to stream conversation: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;

            if let Some((conversation_id,)) = rows.try_next().await
                .map_err(|e| AppError(format!("Failed to get next row: {}", e), StatusCode::INTERNAL_SERVER_ERROR))? {
                let participants = self.get_conversation_participants(&conversation_id.to_string()).await?;
                return Ok(Conversation {
                    id: conversation_id.to_string(),
                    name: new_conversation.name,
                    is_group: false,
                    created_at: now,
                    updated_at: now,
                    last_message_at: None,
                    participant_ids: participants.into_iter().map(|p| p.to_string()).collect(),
                });
            }
        }
    
        let conversation_id = Uuid::new_v4();
        let creator_uuid = Uuid::parse_str(&creator_id)
            .map_err(|e| AppError(format!("Invalid creator ID: {}", e), StatusCode::BAD_REQUEST))?;
    
        let create_conv_stmt = Statement::new(
            "INSERT INTO conversations (conversation_id, title, created_at, updated_at, one_to_one_key) VALUES (?, ?, ?, ?, ?)"
        );
        self.session.query_unpaged(
            create_conv_stmt,
            (
                conversation_id,
                &new_conversation.name,
                CqlTimestamp(now),
                CqlTimestamp(now),
                one_to_one_key.as_deref(),
            )
        ).await.map_err(|e| AppError(format!("Failed to create conversation: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;
    
        if let Some(ref key) = one_to_one_key {
            let stmt = Statement::new(
                "INSERT INTO one_to_one_conversations (one_to_one_key, conversation_id) VALUES (?, ?)"
            );
            self.session.query_unpaged(stmt, (key, conversation_id)).await.map_err(|e| {
                AppError(format!("Failed to insert into one_to_one_conversations: {}", e), StatusCode::INTERNAL_SERVER_ERROR)
            })?;
        }
    
        let add_creator_participant_stmt = Statement::new(
            "INSERT INTO conversation_participants (conversation_id, user_id, joined_at) VALUES (?, ?, ?)"
        );
        self.session.query_unpaged(
            add_creator_participant_stmt,
            (conversation_id, creator_uuid, CqlTimestamp(now))
        ).await.map_err(|e| AppError(format!("Failed to add creator to conversation: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;
    
        let add_creator_user_conv_stmt = Statement::new(
            "INSERT INTO user_conversations (user_id, conversation_id, joined_at) VALUES (?, ?, ?)"
        );
        self.session.query_unpaged(
            add_creator_user_conv_stmt,
            (creator_uuid, conversation_id, CqlTimestamp(now))
        ).await.map_err(|e| AppError(format!("Failed to add creator to user_conversations: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;
    
        for participant_id in new_conversation.participant_ids {
            if participant_id != creator_id {
                let participant_uuid = Uuid::parse_str(&participant_id)
                    .map_err(|e| AppError(format!("Invalid participant ID: {}", e), StatusCode::BAD_REQUEST))?;
                
                let add_participant_stmt = Statement::new(
                    "INSERT INTO conversation_participants (conversation_id, user_id, joined_at) VALUES (?, ?, ?)"
                );
                self.session.query_unpaged(
                    add_participant_stmt,
                    (conversation_id, participant_uuid, CqlTimestamp(now))
                ).await.map_err(|e| AppError(format!("Failed to add participant to conversation: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;
    
                let add_user_conv_stmt = Statement::new(
                    "INSERT INTO user_conversations (user_id, conversation_id, joined_at) VALUES (?, ?, ?)"
                );
                self.session.query_unpaged(
                    add_user_conv_stmt,
                    (participant_uuid, conversation_id, CqlTimestamp(now))
                ).await.map_err(|e| AppError(format!("Failed to add participant to user_conversations: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;
            }
        }
    
        let participants = self.get_conversation_participants(&conversation_id.to_string()).await?;
    
        Ok(Conversation {
            id: conversation_id.to_string(),
            name: new_conversation.name,
            is_group: participants.len() > 1,
            created_at: now,
            updated_at: now,
            last_message_at: None,
            participant_ids: participants.into_iter().map(|p| p.to_string()).collect(),
        })
    }
    

    async fn get_conversation_participants(&self, conversation_id: &str) -> Result<Vec<Uuid>, AppError> {
        let conv_uuid = Uuid::parse_str(conversation_id)
            .map_err(|e| AppError(format!("Invalid conversation ID: {}", e), StatusCode::BAD_REQUEST))?;

        let stmt = Statement::new(
            "SELECT user_id, joined_at FROM conversation_participants WHERE conversation_id = ?"
        );
        let mut iter = self.session.query_iter(
            stmt,
            (conv_uuid,)
        ).await
        .map_err(|e| AppError(format!("Failed to get participants: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?
        .rows_stream::<(Uuid, CqlTimestamp)>()
        .map_err(|e| AppError(format!("Failed to stream participants: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;

        let mut participants = Vec::new();
        while let Some((user_id, _)) = iter.try_next().await
            .map_err(|e| AppError(format!("Failed to process participant: {}", e), StatusCode::INTERNAL_SERVER_ERROR))? {
            participants.push(user_id);
        }
        Ok(participants)
    }

    pub async fn get_conversation(&self, id: &str) -> Result<Conversation, AppError> {
        let conversation_id = Uuid::parse_str(id)
            .map_err(|e| AppError(format!("Invalid conversation ID: {}", e), StatusCode::BAD_REQUEST))?;

        let stmt = Statement::new(
            "SELECT conversation_id, title, created_at, updated_at FROM conversations WHERE conversation_id = ?"
        );
        let mut iter = self.session.query_iter(
            stmt,
            (conversation_id,)
        ).await
        .map_err(|e| AppError(format!("Failed to get conversation: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?
        .rows_stream::<(Uuid, Option<String>, CqlTimestamp, CqlTimestamp)>()
        .map_err(|e| AppError(format!("Failed to stream conversation: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;

        match iter.try_next().await {
            Ok(Some((id, title, created_at, updated_at))) => {
                let participants = self.get_conversation_participants(&id.to_string()).await?;
                Ok(Conversation {
                    id: id.to_string(),
                    name: title,
                    is_group: participants.len() > 1,
                    created_at: created_at.0,
                    updated_at: updated_at.0,
                    last_message_at: None,
                    participant_ids: participants.into_iter().map(|p| p.to_string()).collect(),
                })
            }
            Ok(None) => Err(AppError("Conversation not found".into(), StatusCode::NOT_FOUND)),
            Err(e) => Err(AppError(format!("Failed to get conversation: {}", e), StatusCode::INTERNAL_SERVER_ERROR)),
        }
    }

    pub async fn list_conversations(
        &self,
        user_id: &str,
    ) -> Result<Vec<Conversation>, AppError> {
        let user_uuid = Uuid::parse_str(user_id)
            .map_err(|e| {
                eprintln!("Error parsing user ID: {}", e);
                AppError(format!("Invalid user ID: {}", e), StatusCode::BAD_REQUEST)
            })?;
    
        let stmt = Statement::new(
            "SELECT conversation_id FROM user_conversations WHERE user_id = ?"
        );
        
        let mut iter = self
            .session
            .query_iter(stmt, (user_uuid,))
            .await
            .map_err(|e| {
                eprintln!("Error querying user conversations: {}", e);
                AppError(format!("Failed to list conversations: {}", e), StatusCode::INTERNAL_SERVER_ERROR)
            })?
            .rows_stream::<(Uuid,)>()
            .map_err(|e| {
                eprintln!("Error streaming conversation IDs: {}", e);
                AppError(format!("Failed to stream conversation ids: {}", e), StatusCode::INTERNAL_SERVER_ERROR)
            })?;
    
        let mut conversation_ids = Vec::new();
        while let Some((conversation_id,)) = iter.try_next().await
            .map_err(|e| {
                eprintln!("Error processing conversation ID: {}", e);
                AppError(format!("Failed to process conversation id: {}", e), StatusCode::INTERNAL_SERVER_ERROR)
            })? {
            conversation_ids.push(conversation_id);
        }
    
        let mut conversations = Vec::new();
        for id in conversation_ids {
            let stmt = Statement::new(
                "SELECT title, created_at, updated_at FROM conversations WHERE conversation_id = ?"
            );
            let mut rows = self
                .session
                .query_iter(stmt, (id,))
                .await
                .map_err(|e| {
                    eprintln!("Error fetching conversation details: {}", e);
                    AppError(format!("Failed to fetch conversation: {}", e), StatusCode::INTERNAL_SERVER_ERROR)
                })?
                .rows_stream::<(Option<String>, CqlTimestamp, CqlTimestamp)>()
                .map_err(|e| {
                    eprintln!("Error streaming conversation details: {}", e);
                    AppError(format!("Failed to stream conversation: {}", e), StatusCode::INTERNAL_SERVER_ERROR)
                })?;
    
            if let Some((title, created_at, updated_at)) = rows.try_next().await
                .map_err(|e| {
                    eprintln!("Error processing conversation details: {}", e);
                    AppError(format!("Failed to process conversation: {}", e), StatusCode::INTERNAL_SERVER_ERROR)
                })? {
                let participants = self.get_conversation_participants(&id.to_string()).await?;
                conversations.push(Conversation {
                    id: id.to_string(),
                    name: title,
                    is_group: participants.len() > 1,
                    created_at: created_at.0,
                    updated_at: updated_at.0,
                    last_message_at: None,
                    participant_ids: participants.into_iter().map(|p| p.to_string()).collect(),
                });
            }
        }
    
        Ok(conversations)
    }
    

    pub async fn update_conversation(
        &self,
        id: &str,
        name: Option<String>,
    ) -> Result<Conversation, AppError> {
        let conversation_id = Uuid::parse_str(id)
            .map_err(|e| AppError(format!("Invalid conversation ID: {}", e), StatusCode::BAD_REQUEST))?;
        let now = Utc::now().timestamp();
        
        let stmt = Statement::new(
            "UPDATE conversations SET title = ?, updated_at = ? WHERE conversation_id = ?"
        );
        self.session.query_unpaged(
            stmt,
            (name.clone(), CqlTimestamp(now), conversation_id)
        ).await
        .map_err(|e| AppError(format!("Failed to update conversation: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;

        self.get_conversation(id).await
    }

    pub async fn send_message(
        &self,
        conversation_id: &str,
        sender_id: &str,
        new_message: NewMessage,
    ) -> Result<Message, AppError> {
        let conversation_uuid = Uuid::parse_str(conversation_id)
            .map_err(|e| AppError(format!("Invalid conversation ID: {}", e), StatusCode::BAD_REQUEST))?;
        let sender_uuid = Uuid::parse_str(sender_id)
            .map_err(|e| AppError(format!("Invalid sender ID: {}", e), StatusCode::BAD_REQUEST))?;
    
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap();
        let ts = Timestamp::from_unix(&NoContext, now.as_secs(), now.subsec_nanos());
        let message_id = Uuid::new_v1(ts, &[1, 2, 3, 4, 5, 6]);
    
        let now_ts = CqlTimestamp(now.as_secs() as i64 * 1000); 
    
        let stmt = Statement::new(
            "INSERT INTO messages (conversation_id, message_id, sender_id, content, sent_at, edited_at) 
             VALUES (?, ?, ?, ?, ?, ?)"
        );
        
        self.session.query_unpaged(
            stmt,
            (
                conversation_uuid,
                CqlTimeuuid::from_bytes(*message_id.as_bytes()),
                sender_uuid,
                new_message.content.clone(),
                now_ts,
                now_ts,
            )
        ).await
        .map_err(|e| AppError(format!("Failed to send message: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;
    
        Ok(Message {
            id: message_id.to_string(),
            conversation_id: conversation_id.to_string(),
            sender_id: sender_id.to_string(),
            content: new_message.content,
            created_at: now.as_secs() as i64,
            updated_at: now.as_secs() as i64,
            is_edited: false,
            is_deleted: false,
        })
    }

    pub async fn list_messages(
        &self,
        conversation_id: &str,
        limit: i32,
    ) -> Result<Vec<Message>, AppError> {
        let conversation_uuid = Uuid::parse_str(conversation_id)
            .map_err(|e| AppError(format!("Invalid conversation ID: {}", e), StatusCode::BAD_REQUEST))?;

        let stmt = Statement::new(
            "SELECT conversation_id, message_id, sender_id, content, sent_at, edited_at 
             FROM messages 
             WHERE conversation_id = ? 
             ORDER BY message_id DESC 
             LIMIT ?"
        );
        let mut iter = self.session.query_iter(
            stmt,
            (conversation_uuid, limit)
        ).await
        .map_err(|e| AppError(format!("Failed to list messages: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?
        .rows_stream::<(Uuid, CqlTimeuuid, Uuid, String, CqlTimestamp, CqlTimestamp)>()
        .map_err(|e| AppError(format!("Failed to stream messages: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;

        let mut messages = Vec::new();
        while let Some((conv_id, msg_id, sender_id, content, sent_at, edited_at)) = iter.try_next().await
            .map_err(|e| AppError(format!("Failed to process message: {}", e), StatusCode::INTERNAL_SERVER_ERROR))? {
            messages.push(Message {
                id: msg_id.to_string(),
                conversation_id: conv_id.to_string(),
                sender_id: sender_id.to_string(),
                content,
                created_at: sent_at.0,
                updated_at: edited_at.0,
                is_edited: sent_at.0 != edited_at.0,
                is_deleted: false,
            });
        }

        Ok(messages)
    }
} 