use serde::{Serialize, Deserialize};
use serde;
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {
    pub id: String,
    pub username: String,
    pub email: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub last_seen_at: Option<i64>,
    pub is_online: bool,
    pub interests: Option<String>,
    pub language: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct NewUser {
    pub username: String,
    pub email: String,
    pub password: String,
    pub interests: Option<String>,
    pub language: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub user: User,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProfileRequest {
    pub username: Option<String>,
    pub email: Option<String>,
    pub password: Option<String>,
    pub interests: Option<String>,
    pub language: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserProfile {
    pub id: String,
    pub username: String,
    pub email: String,
    pub created_at: i64,
    pub last_seen_at: Option<i64>,
    pub is_online: bool,
    pub interests: Option<String>,
    pub language: Option<String>,
}

impl User {
    pub fn new(id: String, username: String, email: String, password_hash: String, interests: Option<String>, language: Option<String>) -> Self {
        let now = Utc::now().timestamp();
        Self {
            id,
            username,
            email,
            password_hash,
            created_at: now,
            updated_at: now,
            last_seen_at: None,
            is_online: false,
            interests: Some(interests.unwrap_or("".to_string())),
            language: Some(language.unwrap_or("".to_string())),
        }
    }

    pub fn to_profile(&self) -> UserProfile {
        UserProfile {
            id: self.id.clone(),
            username: self.username.clone(),
            email: self.email.clone(),
            created_at: self.created_at,
            last_seen_at: self.last_seen_at,
            is_online: self.is_online,
            interests: self.interests.clone(),
            language: self.language.clone(),
        }
    }
}