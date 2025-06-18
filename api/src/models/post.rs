use serde::{Serialize, Deserialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Post {
    pub id: String,
    pub user_id: String,
    pub title: String,
    pub content: String,
    pub code: Option<String>,
    pub language: Option<String>,
    pub tags: Option<Vec<String>>,
    pub created_at: i64,
    pub updated_at: i64,
    pub is_published: bool,
    pub likes_count: i64,
}

#[derive(Debug, Deserialize)]
pub struct NewPost {
    pub title: String,
    pub content: String,
    pub code: Option<String>,
    pub language: Option<String>,
    pub tags: Option<Vec<String>>,
    pub is_published: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePost {
    pub title: Option<String>,
    pub content: Option<String>,
    pub code: Option<String>,
    pub language: Option<String>,
    pub tags: Option<Vec<String>>,
    pub is_published: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct PostResponse {
    pub post: Post,
    pub author: PostAuthor,
}

#[derive(Debug, Serialize, Clone)]
pub struct PostAuthor {
    pub user_id: String,
    pub username: String,
}

impl Post {
    pub fn new(
        id: String,
        user_id: String,
        title: String,
        content: String,
        code: Option<String>,
        language: Option<String>,
        tags: Option<Vec<String>>,
        is_published: bool,
    ) -> Self {
        let now = Utc::now().timestamp();
        Self {
            id,
            user_id,
            title,
            content,
            code,
            language,
            tags,
            created_at: now,
            updated_at: now,
            is_published,
            likes_count: 0,
        }
    }
} 
