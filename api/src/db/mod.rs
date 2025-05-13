use actix_web::web;
use scylla::client::{session::Session, session_builder::SessionBuilder};
use scylla::errors::{ExecutionError, NewSessionError};
use futures_util::stream::TryStreamExt;

pub async fn connect() -> Result<Session, NewSessionError> {
    let session = SessionBuilder::new().known_node("0.0.0.0:9042").build().await?;
    Ok(session)
}

pub async fn setup_database(session: &web::Data<Session>, new: bool) -> Result<(), ExecutionError> {
    session.query_unpaged(
        "CREATE KEYSPACE IF NOT EXISTS messenger WITH REPLICATION = { 'class' : 'SimpleStrategy', 'replication_factor' : 1 }",
        &[]
    ).await?;
    
    session.query_unpaged("USE messenger", &[]).await?;
    
    if new {

        session.query_unpaged("DROP TABLE IF EXISTS messages", &[]).await?;
        session.query_unpaged("DROP TABLE IF EXISTS user_conversations", &[]).await?;
        session.query_unpaged("DROP TABLE IF EXISTS conversation_participants", &[]).await?;
        session.query_unpaged("DROP TABLE IF EXISTS conversations", &[]).await?;
        session.query_unpaged("DROP TABLE IF EXISTS users", &[]).await?;
    }
    
    session.query_unpaged(
        "CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY,
            username TEXT,
            email TEXT,
            password_hash TEXT,
            created_at TIMESTAMP,
            updated_at TIMESTAMP,
            last_seen_at TIMESTAMP,
            is_online BOOLEAN
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
