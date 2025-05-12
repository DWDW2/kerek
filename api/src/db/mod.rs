use actix_web::web;
use scylla::client::{session::Session, session_builder::SessionBuilder};
use scylla::errors::{ExecutionError, NewSessionError};

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
    use uuid::Uuid;
    use chrono::Utc;
    use crate::models::user::{User, NewUser};
    pub async fn create(session: &web::Data<Session>, new_user: NewUser) -> Result<User, ExecutionError> {
        let id = Uuid::new_v4();
        let now = Utc::now().timestamp_millis();
        session.query_unpaged(
            "INSERT INTO users (id, username, email, password_hash, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)",
            (&id, &new_user.username, &new_user.email, &new_user.password_hash, &now, &now)
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
    
    pub async fn find_by_email(session: &web::Data<Session>, email: &str) -> Result<Option<User>, ExecutionError> {
        let result = session.query_unpaged(
            "SELECT id, username, email FROM users WHERE email = ?",
            &(email,)
        ).await?;
        
        let rows = result.is_rows();
        if rows {
            return Ok(None);
        }
        
        let row = result.into_rows_result().unwrap();
        
        println!("{:?}", row);
        Ok(Some(User {
            id: "fake_id".to_string(),
            username: "fake_username".to_string(),
            email: "fake_email".to_string(),
            password_hash: "fake_password_hash".to_string(),
            created_at: 0,
            updated_at: 0,
        }))
    }
    
}