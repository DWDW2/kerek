use actix_web::web;
use scylla::client::{session::Session, session_builder::SessionBuilder};
use scylla::errors::{ExecutionError, NewSessionError};
use futures_util::stream::TryStreamExt;
use actix_web::http::StatusCode;

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
    use scylla::{errors::PagerExecutionError, value::CqlTimestamp};
    use uuid::Uuid;
    use chrono::Utc;
    use crate::{error::AppError, models::user::{NewUser, User}};


    pub async fn create(session: &web::Data<Session>, new_user: NewUser) -> Result<User, ExecutionError> {
        let id = Uuid::new_v4();
        let now = Utc::now().timestamp_millis();
        session.query_unpaged(
            "INSERT INTO users (id, username, email, password_hash, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)",
            (&id, &new_user.username, &new_user.email, &new_user.password_hash, CqlTimestamp(now), CqlTimestamp(now))
        ).await?;
        
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
            "SELECT id, username, email, password_hash FROM users WHERE email = ?",
            (email,),
        ).await.unwrap().rows_stream::<(Uuid, String, String, String)>().unwrap();

        match iter.try_next().await {
            Ok(Some(row)) => {
                let (id, username, email, password_hash) = row;
                println!("id: {}, username: {}, email: {}, password_hash: {}", id, username, email, password_hash);
                Ok(Some(User {
                    id: id.to_string(),
                    username,
                    email,
                    password_hash,
                    created_at: 0,
                    updated_at: 0,
                }))
            }
            Ok(None) => Ok(None),
            Err(e) => Err(AppError("Failed to find user by email".to_string(), StatusCode::INTERNAL_SERVER_ERROR)),
        }
    }
    
    
}