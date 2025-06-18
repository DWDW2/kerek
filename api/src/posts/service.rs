use futures_util::TryStreamExt;
use scylla::{client::session::Session, value::CqlTimestamp, DeserializeRow};
use crate::{
    error::AppError, 
    models::{
        post::{Post, NewPost, UpdatePost, PostResponse, PostAuthor},
        user::User,
    }, 
    utils::db_client::DbClient
};
use uuid::Uuid;
use actix_web::{http::StatusCode, web};
use std::marker::PhantomData;
use chrono::Utc;

pub struct PostsService {
    session: web::Data<Session>,
}

impl PostsService {
    pub fn new(session: web::Data<Session>) -> Self {
        Self { session }
    }

    pub async fn create_post(
        &self,
        user_id: &str,
        new_post: NewPost,
    ) -> Result<Post, AppError> {
        let post_id = Uuid::new_v4();
        let user_uuid = Uuid::parse_str(user_id)
            .map_err(|e| AppError(format!("Invalid user ID: {}", e), StatusCode::BAD_REQUEST))?;

        let now = Utc::now().timestamp();
        let is_published = new_post.is_published.unwrap_or(false);

        let db_client = DbClient::<Post> {
            session: &self.session,
            _phantom: PhantomData,
        };

        let tags_set: Option<Vec<String>> = new_post.tags.clone();

        db_client.insert(
            "INSERT INTO posts (id, user_id, title, content, code, language, tags, created_at, updated_at, is_published, likes_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                post_id,
                user_uuid,
                &new_post.title,
                &new_post.content,
                &new_post.code,
                &new_post.language,
                &tags_set,
                CqlTimestamp(now * 1000),
                CqlTimestamp(now * 1000),
                is_published,
                0i64,
            )
        ).await?;

        Ok(Post::new(
            post_id.to_string(),
            user_id.to_string(),
            new_post.title,
            new_post.content,
            new_post.code,
            new_post.language,
            new_post.tags,
            is_published,
        ))
    }

    pub async fn get_all_posts(&self, limit: Option<i32>) -> Result<Vec<PostResponse>, AppError> {
        let limit = limit.unwrap_or(50);

        let db_client = DbClient::<Post> {
            session: &self.session,
            _phantom: PhantomData,
        };

        let results = db_client.query::<(Uuid, Uuid, String, String, Option<String>, Option<String>, Option<Vec<String>>, CqlTimestamp, CqlTimestamp, bool, i64), _>(
            "SELECT id, user_id, title, content, code, language, tags, created_at, updated_at, is_published, likes_count FROM posts WHERE is_published = true LIMIT ? ALLOW FILTERING",
            Some((limit,))
        ).await?;

        let mut post_responses = Vec::new();
        
        for (id, user_id, title, content, code, language, tags, created_at, updated_at, is_published, likes_count) in results {
            let author = self.get_user_info(&user_id.to_string()).await?;
            
            let post = Post {
                id: id.to_string(),
                user_id: user_id.to_string(),
                title,
                content,
                code,
                language,
                tags,
                created_at: created_at.0 / 1000,
                updated_at: updated_at.0 / 1000,
                is_published,
                likes_count,
            };

            post_responses.push(PostResponse {
                post,
                author,
            });
        }

        Ok(post_responses)
    }

    pub async fn get_post_by_id(&self, post_id: &str) -> Result<PostResponse, AppError> {
        let post_uuid = Uuid::parse_str(post_id)
            .map_err(|e| AppError(format!("Invalid post ID: {}", e), StatusCode::BAD_REQUEST))?;

        let db_client = DbClient::<Post> {
            session: &self.session,
            _phantom: PhantomData,
        };

        let results = db_client.query::<(Uuid, Uuid, String, String, Option<String>, Option<String>, Option<Vec<String>>, CqlTimestamp, CqlTimestamp, bool, i64), _>(
            "SELECT id, user_id, title, content, code, language, tags, created_at, updated_at, is_published, likes_count FROM posts WHERE id = ?",
            Some((post_uuid,))
        ).await?;

        if let Some((id, user_id, title, content, code, language, tags, created_at, updated_at, is_published, likes_count)) = results.first() {
            let author = self.get_user_info(&user_id.to_string()).await?;
            
            let post = Post {
                id: id.to_string(),
                user_id: user_id.to_string(),
                title: title.clone(),
                content: content.clone(),
                code: code.clone(),
                language: language.clone(),
                tags: tags.clone(),
                created_at: created_at.0 / 1000,
                updated_at: updated_at.0 / 1000,
                is_published: *is_published,
                likes_count: *likes_count,
            };

            Ok(PostResponse {
                post,
                author,
            })
        } else {
            Err(AppError("Post not found".to_string(), StatusCode::NOT_FOUND))
        }
    }

    pub async fn get_posts_by_user(&self, user_id: &str, limit: Option<i32>) -> Result<Vec<PostResponse>, AppError> {
        let user_uuid = Uuid::parse_str(user_id)
            .map_err(|e| AppError(format!("Invalid user ID: {}", e), StatusCode::BAD_REQUEST))?;
        let limit = limit.unwrap_or(50);

        let db_client = DbClient::<Post> {
            session: &self.session,
            _phantom: PhantomData,
        };

        let results = db_client.query::<(Uuid, Uuid, String, String, Option<String>, Option<String>, Option<Vec<String>>, CqlTimestamp, CqlTimestamp, bool, i64), _>(
            "SELECT id, user_id, title, content, code, language, tags, created_at, updated_at, is_published, likes_count FROM posts WHERE user_id = ? LIMIT ? ALLOW FILTERING",
            Some((user_uuid, limit))
        ).await?;

        let author = self.get_user_info(user_id).await?;
        let mut post_responses = Vec::new();
        
        for (id, user_id, title, content, code, language, tags, created_at, updated_at, is_published, likes_count) in results {
            let post = Post {
                id: id.to_string(),
                user_id: user_id.to_string(),
                title,
                content,
                code,
                language,
                tags,
                created_at: created_at.0 / 1000,
                updated_at: updated_at.0 / 1000,
                is_published,
                likes_count,
            };

            post_responses.push(PostResponse {
                post,
                author: author.clone(),
            });
        }

        Ok(post_responses)
    }

    pub async fn update_post(
        &self,
        post_id: &str,
        user_id: &str,
        update_post: UpdatePost,
    ) -> Result<Post, AppError> {
        let post_uuid = Uuid::parse_str(post_id)
            .map_err(|e| AppError(format!("Invalid post ID: {}", e), StatusCode::BAD_REQUEST))?;
        let user_uuid = Uuid::parse_str(user_id)
            .map_err(|e| AppError(format!("Invalid user ID: {}", e), StatusCode::BAD_REQUEST))?;

        let existing_post = self.get_post_by_id(post_id).await?;
        if existing_post.post.user_id != user_id {
            return Err(AppError("Unauthorized: You can only edit your own posts".to_string(), StatusCode::FORBIDDEN));
        }

        let db_client = DbClient::<Post> {
            session: &self.session,
            _phantom: PhantomData,
        };

        let now = Utc::now().timestamp();
        let mut post = existing_post.post;

        if let Some(title) = update_post.title {
            post.title = title;
        }
        if let Some(content) = update_post.content {
            post.content = content;
        }
        if let Some(code) = update_post.code {
            post.code = Some(code);
        }
        if let Some(language) = update_post.language {
            post.language = Some(language);
        }
        if let Some(tags) = update_post.tags {
            post.tags = Some(tags);
        }
        if let Some(is_published) = update_post.is_published {
            post.is_published = is_published;
        }
        post.updated_at = now;

        db_client.insert(
            "INSERT INTO posts (id, user_id, title, content, code, language, tags, created_at, updated_at, is_published, likes_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                post_uuid,
                user_uuid,
                &post.title,
                &post.content,
                &post.code,
                &post.language,
                &post.tags,
                CqlTimestamp(post.created_at * 1000),
                CqlTimestamp(now * 1000),
                post.is_published,
                post.likes_count,
            )
        ).await?;

        Ok(post)
    }

    pub async fn delete_post(&self, post_id: &str, user_id: &str) -> Result<(), AppError> {
        let post_uuid = Uuid::parse_str(post_id)
            .map_err(|e| AppError(format!("Invalid post ID: {}", e), StatusCode::BAD_REQUEST))?;

        let existing_post = self.get_post_by_id(post_id).await?;
        if existing_post.post.user_id != user_id {
            return Err(AppError("Unauthorized: You can only delete your own posts".to_string(), StatusCode::FORBIDDEN));
        }

        let db_client = DbClient::<Post> {
            session: &self.session,
            _phantom: PhantomData,
        };

        db_client.insert(
            "DELETE FROM posts WHERE id = ?",
            (post_uuid,)
        ).await?;

        Ok(())
    }

    async fn get_user_info(&self, user_id: &str) -> Result<PostAuthor, AppError> {
        let user_uuid = Uuid::parse_str(user_id)
            .map_err(|e| AppError(format!("Invalid user ID: {}", e), StatusCode::BAD_REQUEST))?;

        let db_client = DbClient::<User> {
            session: &self.session,
            _phantom: PhantomData,
        };

        let results = db_client.query::<(Uuid, String), _>(
            "SELECT id, username FROM users WHERE id = ?",
            Some((user_uuid,))
        ).await?;

        if let Some((id, username)) = results.first() {
            Ok(PostAuthor {
                user_id: id.to_string(),
                username: username.clone(),
            })
        } else {
            Err(AppError("User not found".to_string(), StatusCode::NOT_FOUND))
        }
    }

    pub async fn toggle_like_post(&self, post_id: &str, user_id: &str) -> Result<Post, AppError> {
        let post_uuid = Uuid::parse_str(post_id)
            .map_err(|e| AppError(format!("Invalid post ID: {}", e), StatusCode::BAD_REQUEST))?;

        let existing_post = self.get_post_by_id(post_id).await?;
        let mut post = existing_post.post;

        post.likes_count += 1;

        let db_client = DbClient::<Post> {
            session: &self.session,
            _phantom: PhantomData,
        };

        let user_uuid = Uuid::parse_str(&post.user_id)
            .map_err(|e| AppError(format!("Invalid user ID: {}", e), StatusCode::BAD_REQUEST))?;

        db_client.insert(
            "INSERT INTO posts (id, user_id, title, content, code, language, tags, created_at, updated_at, is_published, likes_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                post_uuid,
                user_uuid,
                &post.title,
                &post.content,
                &post.code,
                &post.language,
                &post.tags,
                CqlTimestamp(post.created_at * 1000),
                CqlTimestamp(post.updated_at * 1000),
                post.is_published,
                post.likes_count,
            )
        ).await?;

        Ok(post)
    }
}
