use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Conversation {
    pub id: String,
    pub name: Option<String>,
    pub is_group: bool, 
    pub created_at: i64,
    pub updated_at: i64,
    pub last_message_at: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct NewConversation {
    pub name: Option<String>,
    pub is_group: bool,
    pub participant_ids: Vec<String>,
}
