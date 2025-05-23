use serde::{Serialize, Deserialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Conversation {
    pub id: String,
    pub name: Option<String>,
    pub is_group: bool,
    pub created_at: i64,
    pub updated_at: i64,
    pub last_message_at: Option<i64>,
    pub participant_ids: Vec<String>,
    pub customization: Option<ConversationCustomization>,
}

#[derive(Debug, Deserialize)]
pub struct NewConversation {
    pub name: Option<String>,
    pub is_group: bool,
    pub participant_ids: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct ConversationResponse {
    pub conversation: Conversation,
    pub participants: Vec<ConversationParticipant>,
}

#[derive(Debug, Serialize)]
pub struct ConversationParticipant {
    pub user_id: String,
    pub username: String,
    pub joined_at: i64,
}

impl Conversation {
    pub fn new(
        id: String,
        name: Option<String>,
        is_group: bool,
        participant_ids: Vec<String>,
    ) -> Self {
        let now = Utc::now().timestamp();
        Self {
            id,
            name,
            is_group,
            created_at: now,
            updated_at: now,
            last_message_at: None,
            participant_ids,
            customization: None,
        }
    }
}


#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConversationCustomization {
    pub background_image_url: Option<String>,
    pub primary_message_color: Option<String>,
    pub secondary_message_color: Option<String>,
    pub text_color_primary: Option<String>,
    pub text_color_secondary: Option<String>,
}

