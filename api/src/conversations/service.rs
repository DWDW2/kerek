use actix_multipart::Multipart;
use futures_util::TryStreamExt;
use scylla::client::session::Session;
use serde::{Deserialize, Serialize};
use crate::{
    error::AppError, models::{
        conversation::{Conversation, ConversationCustomization, NewConversation},
        message::{Message, NewMessage},
        user::User,
    }, utils::{db_client::DbClient, one_to_one::one_to_one_key}
};
use chrono::Utc;
use uuid::{NoContext, Timestamp, Uuid};
use scylla::value::CqlTimestamp;
use actix_web::http::StatusCode;
use actix_web::web;
use std::time::{SystemTime, UNIX_EPOCH};
use scylla::value::CqlTimeuuid;
use std::marker::PhantomData;
use aws_sdk_s3 as s3;
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

        let db_client = DbClient::<Conversation> { 
            session: &self.session, 
            _phantom: PhantomData 
        };

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
            let results = db_client.query::<(Uuid,), _>(
                "SELECT conversation_id FROM one_to_one_conversations WHERE one_to_one_key = ?",
                Some((key,))
            ).await?;

            if let Some((conversation_id,)) = results.first() {
                let participants = self.get_conversation_participants(&conversation_id.to_string()).await?;
                return Ok(Conversation {
                    id: conversation_id.to_string(),
                    name: new_conversation.name,
                    is_group: false,
                    created_at: now,
                    updated_at: now,
                    last_message_at: None,
                    participant_ids: participants.into_iter().map(|p| p.to_string()).collect(),
                    customization: None,
                });
            }
        }
    
        let conversation_id = Uuid::new_v4();
        let creator_uuid = Uuid::parse_str(&creator_id)
            .map_err(|e| AppError(format!("Invalid creator ID: {}", e), StatusCode::BAD_REQUEST))?;
    
        db_client.insert(
            "INSERT INTO conversations (conversation_id, title, created_at, updated_at, one_to_one_key) VALUES (?, ?, ?, ?, ?)",
            (
                conversation_id,
                &new_conversation.name,
                CqlTimestamp(now),
                CqlTimestamp(now),
                one_to_one_key.as_deref(),
            )
        ).await?;
    
        if let Some(ref key) = one_to_one_key {
            db_client.insert(
                "INSERT INTO one_to_one_conversations (one_to_one_key, conversation_id) VALUES (?, ?)",
                (key, conversation_id)
            ).await?;
        }
    
        db_client.insert(
            "INSERT INTO conversation_participants (conversation_id, user_id, joined_at) VALUES (?, ?, ?)",
            (conversation_id, creator_uuid, CqlTimestamp(now))
        ).await?;
    
        db_client.insert(
            "INSERT INTO user_conversations (user_id, conversation_id, joined_at) VALUES (?, ?, ?)",
            (creator_uuid, conversation_id, CqlTimestamp(now))
        ).await?;
    
        for participant_id in new_conversation.participant_ids {
            if participant_id != creator_id {
                let participant_uuid = Uuid::parse_str(&participant_id)
                    .map_err(|e| AppError(format!("Invalid participant ID: {}", e), StatusCode::BAD_REQUEST))?;
                
                db_client.insert(
                    "INSERT INTO conversation_participants (conversation_id, user_id, joined_at) VALUES (?, ?, ?)",
                    (conversation_id, participant_uuid, CqlTimestamp(now))
                ).await?;
    
                db_client.insert(
                    "INSERT INTO user_conversations (user_id, conversation_id, joined_at) VALUES (?, ?, ?)",
                    (participant_uuid, conversation_id, CqlTimestamp(now))
                ).await?;
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
            customization: None,
        })
    }
    
    async fn get_conversation_participants(&self, conversation_id: &str) -> Result<Vec<Uuid>, AppError> {
        let conv_uuid = Uuid::parse_str(conversation_id)
            .map_err(|e| AppError(format!("Invalid conversation ID: {}", e), StatusCode::BAD_REQUEST))?;
        
        let db_client = DbClient::<String> { 
            session: &self.session, 
            _phantom: PhantomData 
        };

        let results = db_client.query::<(Uuid, CqlTimestamp), _>(
            "SELECT user_id, joined_at FROM conversation_participants WHERE conversation_id = ?",
            Some((conv_uuid,))
        ).await?;

        let participants = results.into_iter()
            .map(|(user_id, _)| user_id)
            .collect();

        Ok(participants)
    }

    pub async fn get_conversation(&self, id: &str) -> Result<Conversation, AppError> {
        let conversation_id = Uuid::parse_str(id)
            .map_err(|e| AppError(format!("Invalid conversation ID: {}", e), StatusCode::BAD_REQUEST))?;

        let db_client = DbClient::<Conversation> { 
            session: &self.session, 
            _phantom: PhantomData 
        };

        let results = db_client.query::<(Uuid, Option<String>, CqlTimestamp, CqlTimestamp), _>(
            "SELECT conversation_id, title, created_at, updated_at FROM conversations WHERE conversation_id = ?",
            Some((conversation_id,))
        ).await?;

        if let Some((id, title, created_at, updated_at)) = results.first() {
            let participants = self.get_conversation_participants(&id.to_string()).await?;
            let customization = db_client.query::<(Option<String>, Option<String>, Option<String>, Option<String>, Option<String>), _>(
                "SELECT background_image_url, primary_message_color, secondary_message_color, text_color_primary, text_color_secondary FROM conversation_customization WHERE conversation_id = ?",
                Some((id,))
            ).await?;

            let customization = customization.first().map(|(background_image_url, primary_message_color, secondary_message_color, text_color_primary, text_color_secondary)| {
                ConversationCustomization {
                    background_image_url: background_image_url.clone(),
                    primary_message_color: primary_message_color.clone(),
                    secondary_message_color: secondary_message_color.clone(),
                    text_color_primary: text_color_primary.clone(),
                    text_color_secondary: text_color_secondary.clone(),
                }
            });

            Ok(Conversation {
                id: id.to_string(),
                name: title.clone(),
                is_group: participants.len() > 1,
                created_at: created_at.0,
                updated_at: updated_at.0,
                last_message_at: None,
                participant_ids: participants.into_iter().map(|p| p.to_string()).collect(),
                customization,
            })
        } else {
            Err(AppError("Conversation not found".into(), StatusCode::NOT_FOUND))
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
    
        let db_client = DbClient::<Conversation> { 
            session: &self.session, 
            _phantom: PhantomData 
        };

        let results = db_client.query::<(Uuid,), _>(
            "SELECT conversation_id FROM user_conversations WHERE user_id = ?",
            Some((user_uuid,))
        ).await?;
    
        let conversation_ids: Vec<Uuid> = results.into_iter()
            .map(|(id,)| id)
            .collect();
    
        let mut conversations = Vec::new();
        for id in conversation_ids {
            let results = db_client.query::<(Option<String>, CqlTimestamp, CqlTimestamp), _>(
                "SELECT title, created_at, updated_at FROM conversations WHERE conversation_id = ?",
                Some((id,))
            ).await?;
    
            if let Some((title, created_at, updated_at)) = results.first() {
                let participants = self.get_conversation_participants(&id.to_string()).await?;
                let customization = db_client.query::<(Option<String>, Option<String>, Option<String>, Option<String>, Option<String>), _>(
                    "SELECT background_image_url, primary_message_color, secondary_message_color, text_color_primary, text_color_secondary FROM conversation_customization WHERE conversation_id = ?",
                    Some((id,))
                ).await?;

                let customization = customization.first().map(|(background_image_url, primary_message_color, secondary_message_color, text_color_primary, text_color_secondary)| {
                    ConversationCustomization {
                        background_image_url: background_image_url.clone(),
                        primary_message_color: primary_message_color.clone(),
                        secondary_message_color: secondary_message_color.clone(),
                        text_color_primary: text_color_primary.clone(),
                        text_color_secondary: text_color_secondary.clone(),
                    }   
                });

                conversations.push(Conversation {
                    id: id.to_string(),
                    name: title.clone(),
                    is_group: participants.len() > 1,
                    created_at: created_at.0,
                    updated_at: updated_at.0,
                    last_message_at: None,
                    participant_ids: participants.into_iter().map(|p| p.to_string()).collect(),
                    customization,
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
        
        let db_client = DbClient::<Conversation> { 
            session: &self.session, 
            _phantom: PhantomData 
        };

        db_client.insert(
            "UPDATE conversations SET title = ?, updated_at = ? WHERE conversation_id = ?",
            (name.clone(), CqlTimestamp(now), conversation_id)
        ).await?;

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
    
        let db_client = DbClient::<Message> { 
            session: &self.session, 
            _phantom: PhantomData 
        };
        
        db_client.insert(
            "INSERT INTO messages (conversation_id, message_id, sender_id, content, sent_at, edited_at) 
             VALUES (?, ?, ?, ?, ?, ?)",
            (
                conversation_uuid,
                CqlTimeuuid::from_bytes(*message_id.as_bytes()),
                sender_uuid,
                new_message.content.clone(),
                now_ts,
                now_ts,
            )
        ).await?;
    
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

        let db_client = DbClient::<Message> { 
            session: &self.session, 
            _phantom: PhantomData 
        };

        let results = db_client.query::<(Uuid, CqlTimeuuid, Uuid, String, CqlTimestamp, CqlTimestamp), _>(
            "SELECT conversation_id, message_id, sender_id, content, sent_at, edited_at 
             FROM messages 
             WHERE conversation_id = ? 
             ORDER BY message_id DESC 
             LIMIT ?",
            Some((conversation_uuid, limit))
        ).await?;

        let messages = results.into_iter()
            .map(|(conv_id, msg_id, sender_id, content, sent_at, edited_at)| {
                Message {
                    id: msg_id.to_string(),
                    conversation_id: conv_id.to_string(),
                    sender_id: sender_id.to_string(),
                    content,
                    created_at: sent_at.0,
                    updated_at: edited_at.0,
                    is_edited: sent_at.0 != edited_at.0,
                    is_deleted: false,
                }
            })
            .collect();

        Ok(messages)
    }

    pub async fn update_conversation_customization(
        &self,
        conversation_id: &str,
        user_id: &str,
        customization_json: ConversationCustomization,
    ) -> Result<ConversationCustomization, AppError> {
        let conversation_uuid = Uuid::parse_str(conversation_id)
            .map_err(|e| AppError(format!("Invalid conversation ID: {}", e), StatusCode::BAD_REQUEST))?;
        
        let user_uuid = Uuid::parse_str(user_id)
            .map_err(|e| AppError(format!("Invalid user ID: {}", e), StatusCode::BAD_REQUEST))?;

        let db_client = DbClient::<ConversationCustomization> { 
            session: &self.session, 
            _phantom: PhantomData 
        };

        let existing = db_client.query::<(Option<String>, Option<String>, Option<String>, Option<String>, Option<String>), _>(
            "SELECT background_image_url, primary_message_color, secondary_message_color, text_color_primary, text_color_secondary FROM conversation_customization WHERE conversation_id = ? AND user_id = ?",
            Some((conversation_uuid, user_uuid))
        ).await?;
        
        log::info!("Customization: {:?}", customization_json);
        
        if existing.is_empty() {
            db_client.insert(
                "INSERT INTO conversation_customization (conversation_id, user_id, background_image_url, primary_message_color, secondary_message_color, text_color_primary, text_color_secondary) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (
                    conversation_uuid,
                    user_uuid,
                    customization_json.background_image_url.clone(),
                    customization_json.primary_message_color.clone(),
                    customization_json.secondary_message_color.clone(),
                    customization_json.text_color_primary.clone(),
                    customization_json.text_color_secondary.clone()
                )
            ).await?;
        } else {
            db_client.insert(
                "UPDATE conversation_customization SET background_image_url = ?, primary_message_color = ?, secondary_message_color = ?, text_color_primary = ?, text_color_secondary = ? WHERE conversation_id = ? AND user_id = ?",
                (
                    customization_json.background_image_url.clone(),
                    customization_json.primary_message_color.clone(),
                    customization_json.secondary_message_color.clone(),
                    customization_json.text_color_primary.clone(),
                    customization_json.text_color_secondary.clone(),
                    conversation_uuid,
                    user_uuid
                )
            ).await?;
        }
        
        log::info!("Updated conversation customization for conversation {:?}", customization_json);
        Ok(customization_json)
    }
}