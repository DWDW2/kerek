use serde::{Serialize, Deserialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Group {
    pub id: String,
    pub name: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub member_ids: Vec<String>,
    pub customization: Option<GroupCustomization>,
}

#[derive(Debug, Deserialize)]
pub struct NewGroup {
    pub name: String,
    pub member_ids: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct GroupResponse {
    pub group: Group,
    pub members: Vec<GroupMember>,
}

#[derive(Debug, Serialize)]
pub struct GroupMember {
    pub user_id: String,
    pub username: String,
    pub joined_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AddMemberRequest {
    pub user_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RemoveMemberRequest {
    pub user_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateGroupRequest {
    pub name: Option<String>,
}

impl Group {
    pub fn new(
        id: String,
        name: String,
        member_ids: Vec<String>,
    ) -> Self {
        let now = Utc::now().timestamp();
        Self {
            id,
            name,
            created_at: now,
            updated_at: now,
            member_ids,
            customization: None,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GroupCustomization {
    pub background_image_url: Option<String>,
    pub primary_message_color: Option<String>,
    pub secondary_message_color: Option<String>,
    pub text_color_primary: Option<String>,
    pub text_color_secondary: Option<String>,
    pub photo_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GroupMessage {
    pub id: String,
    pub group_id: String,
    pub sender_id: String,
    pub content: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub is_edited: bool,
    pub is_deleted: bool,
}

#[derive(Debug, Deserialize)]
pub struct NewGroupMessage {
    pub content: String,
} 