use serde::{Serialize, Deserialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Message {
    pub id: String,
    pub conversation_id: String,
    pub sender_id: String,
    pub content: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub is_edited: bool,
    pub is_deleted: bool,
}

#[derive(Debug, Deserialize)]
pub struct NewMessage {
    pub content: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateMessage {
    pub content: String,
}

#[derive(Debug, Serialize)]
pub struct MessageResponse {
    pub message: Message,
    pub sender: MessageSender,
}

#[derive(Debug, Serialize)]
pub struct MessageSender {
    pub user_id: String,
    pub username: String,
}

impl Message {
    pub fn new(
        id: String,
        conversation_id: String,
        sender_id: String,
        content: String,
    ) -> Self {
        let now = Utc::now().timestamp();
        Self {
            id,
            conversation_id,
            sender_id,
            content,
            created_at: now,
            updated_at: now,
            is_edited: false,
            is_deleted: false,
        }
    }
}
