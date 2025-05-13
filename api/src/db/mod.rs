use actix_web::web;
use scylla::client::{session::Session, session_builder::SessionBuilder};
use scylla::errors::{ExecutionError, NewSessionError};
use futures_util::stream::TryStreamExt;

pub async fn connect() -> Result<Session, NewSessionError> {
    let session = SessionBuilder::new().known_node("0.0.0.0:9042").build().await?;
    Ok(session)
}

pub async fn setup_database(session: &web::Data<Session>) -> Result<(), ExecutionError> {
    session.query_unpaged(
        "CREATE KEYSPACE IF NOT EXISTS messenger WITH REPLICATION = { 'class' : 'SimpleStrategy', 'replication_factor' : 1 }",
        &[]
    ).await?;
    
    session.query_unpaged("USE messenger", &[]).await?;
    
    session.query_unpaged(
        "CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY,
            username TEXT,
            email TEXT,
            password_hash TEXT,
            created_at TIMESTAMP,
            updated_at TIMESTAMP 
        )",
        &[]
    ).await?;
    
    session.query_unpaged("CREATE INDEX IF NOT EXISTS ON users (username)", &[]).await?;
    session.query_unpaged("CREATE INDEX IF NOT EXISTS ON users (email)", &[]).await?;
    
    session.query_unpaged(
        "CREATE TABLE IF NOT EXISTS conversations (
            id UUID PRIMARY KEY,
            name TEXT,
            is_group BOOLEAN,
            created_at TIMESTAMP,
            updated_at TIMESTAMP,
            last_message_at TIMESTAMP
        )",
        &[]
    ).await?;
    
    session.query_unpaged(
        "CREATE TABLE IF NOT EXISTS conversation_participants (
            conversation_id UUID,
            user_id UUID,
            joined_at TIMESTAMP,
            PRIMARY KEY (conversation_id, user_id)
        )",
        &[]
    ).await?;
    
    session.query_unpaged(
        "CREATE TABLE IF NOT EXISTS user_conversations (
            user_id UUID,
            conversation_id UUID,
            last_read_at TIMESTAMP,
            PRIMARY KEY (user_id, conversation_id)
        )",
        &[]
    ).await?;
    
    session.query_unpaged(
        "CREATE TABLE IF NOT EXISTS messages (
            id UUID,
            conversation_id UUID,
            sender_id UUID,
            content TEXT,
            created_at TIMESTAMP,
            updated_at TIMESTAMP,
            PRIMARY KEY (conversation_id, created_at, id)
        ) WITH CLUSTERING ORDER BY (created_at DESC, id ASC)",
        &[]
    ).await?;
    
    Ok(())
}
pub mod users {
    use super::*;
    use actix_web::http::StatusCode;
    use futures_util::stream::TryStreamExt;
    use scylla::value::CqlTimestamp;
    use uuid::Uuid;
    use scylla::statement::unprepared::Statement;
    use chrono::Utc;
    use crate::{error::AppError, models::user::{NewUser, User}};


    pub async fn create(session: &web::Data<Session>, new_user: NewUser) -> Result<User, AppError> {
        let id = Uuid::new_v4();
        let now = Utc::now().timestamp_millis();
        let statement = Statement::new("INSERT INTO users (id, username, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)");
        session.query_unpaged(
            statement,
            (&id, &new_user.username, &new_user.email, &new_user.password_hash, CqlTimestamp(now), CqlTimestamp(now))
        ).await.map_err(|e| AppError(format!("Failed to create user: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;
        
        Ok(User {
            id: id.to_string() ,
            username: new_user.username,
            email: new_user.email,
            password_hash: new_user.password_hash,
            created_at: now,
            updated_at: now,
        })
    }
    
    pub async fn find_by_email(session: &web::Data<Session>, email: &str) -> Result<Option<User>, AppError> {
        let mut iter = session.query_iter(
            "SELECT id, username, email, password_hash, created_at, updated_at FROM users WHERE email = ?",
            (email,),
        ).await.map_err(|e| AppError(format!("Failed to prepare query: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?
            .rows_stream::<(Uuid, String, String, String, CqlTimestamp, CqlTimestamp)>()
            .map_err(|e| AppError(format!("Failed to get rows stream: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;

        match iter.try_next().await {
            Ok(Some(row)) => {
                let (id, username, email, password_hash, created_at, updated_at) = row;
                Ok(Some(User {
                    id: id.to_string(),
                    username,
                    email,
                    password_hash,
                    created_at: created_at.0,
                    updated_at: updated_at.0,
                }))
            }
            Ok(None) => Ok(None),
            Err(e) => Err(AppError(format!("Failed to find user by email: {}", e), StatusCode::INTERNAL_SERVER_ERROR)),
        }
    }

    pub async fn find_by_id(session: &web::Data<Session>, id: &str) -> Result<Option<User>, AppError> {
        let uuid = Uuid::parse_str(id).map_err(|e| AppError(format!("Invalid UUID format: {}", e), StatusCode::BAD_REQUEST))?;

        let mut iter = session.query_iter(
            "SELECT id, username, email, password_hash, created_at, updated_at FROM users WHERE id = ?",
            (uuid,),
        ).await.map_err(|e| AppError(format!("Failed to prepare query: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?
            .rows_stream::<(Uuid, String, String, String, CqlTimestamp, CqlTimestamp)>()
            .map_err(|e| AppError(format!("Failed to get rows stream: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;

        match iter.try_next().await {
            Ok(Some(row)) => {
                let (id, username, email, password_hash, created_at, updated_at) = row;
                Ok(Some(User {
                    id: id.to_string(),
                    username,
                    email,
                    password_hash,
                    created_at: created_at.0,
                    updated_at: updated_at.0,
                }))
            }
            Ok(None) => Ok(None),
            Err(e) => Err(AppError(format!("Failed to find user by id: {}", e), StatusCode::INTERNAL_SERVER_ERROR)),
        }
    }

     pub async fn update_user(session: &web::Data<Session>, id: &str, updated_user: NewUser) -> Result<User, AppError> {
        let uuid = Uuid::parse_str(id).map_err(|e| AppError(format!("Invalid UUID format: {}", e), StatusCode::BAD_REQUEST))?;
        let now = Utc::now().timestamp_millis();

        session.query_unpaged(
            "UPDATE users SET username = ?, email = ?, password_hash = ?, updated_at = ? WHERE id = ?",
            (&updated_user.username, &updated_user.email, &updated_user.password_hash, CqlTimestamp(now), uuid),
        ).await.map_err(|e| AppError(format!("Failed to update user: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;

        match find_by_id(session, id).await? {
            Some(user) => Ok(user),
            None => Err(AppError("Failed to retrieve updated user".to_string(), StatusCode::INTERNAL_SERVER_ERROR)),
        }
    }

    pub async fn delete_user(session: &web::Data<Session>, id: &str) -> Result<(), AppError> {
        let uuid = Uuid::parse_str(id).map_err(|e| AppError(format!("Invalid UUID format: {}", e), StatusCode::BAD_REQUEST))?;

        session.query_unpaged(
            "DELETE FROM users WHERE id = ?",
            (uuid,),
        ).await.map_err(|e| AppError(format!("Failed to delete user: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;

        Ok(())
    }

    pub async fn search_users(session: &web::Data<Session>, query: &str) -> Result<Vec<User>, AppError> {
        let search_pattern = format!("%{}%", query);
        
        let mut iter = session.query_iter(
            "SELECT id, username, email, password_hash, created_at, updated_at FROM users WHERE username LIKE ? OR email LIKE ? LIMIT 20",
            (&search_pattern, &search_pattern),
        ).await.map_err(|e| AppError(format!("Failed to prepare search query: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?
            .rows_stream::<(Uuid, String, String, String, CqlTimestamp, CqlTimestamp)>()
            .map_err(|e| AppError(format!("Failed to get rows stream: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;

        let mut users = Vec::new();
        while let Some(row) = iter.try_next().await.map_err(|e| AppError(format!("Failed to process search results: {}", e), StatusCode::INTERNAL_SERVER_ERROR))? {
            let (id, username, email, password_hash, created_at, updated_at) = row;
            users.push(User {
                id: id.to_string(),
                username,
                email,
                password_hash,
                created_at: created_at.0,
                updated_at: updated_at.0,
            });
        }

        Ok(users)
    }
}
