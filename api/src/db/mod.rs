use actix_web::web;
use scylla::client::{session::Session, session_builder::SessionBuilder};
use scylla::errors::{ExecutionError, NewSessionError};
use futures_util::stream::TryStreamExt;

pub async fn connect() -> Result<Session, NewSessionError> {
    let host = std::env::var("CASSANDRA_HOST").unwrap_or_else(|_| "127.0.0.1:9042".to_string());
    let max_retries = 5;
    let mut retry_count = 0;
    let mut last_error = None;

    loop {
        match SessionBuilder::new().known_node(host.clone()).build().await {
            Ok(session) => return Ok(session),
            Err(e) => {
                last_error = Some(e);
                retry_count += 1;
                if retry_count >= max_retries {
                    eprintln!("Failed to connect to Cassandra after {} attempts. Last error: {:?}", max_retries, last_error);
                    retry_count = 0;
                }
                tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
            }
        }
    }
}

pub async fn setup_database(session: &web::Data<Session>, new: bool) -> Result<(), ExecutionError> {

    session.query_unpaged(
        "CREATE KEYSPACE IF NOT EXISTS messenger WITH REPLICATION = { 'class' : 'SimpleStrategy', 'replication_factor' : 1 }",
        &[]
    ).await?;
    
    session.query_unpaged("USE messenger", &[]).await?;
    
    if new {
        session.query_unpaged("DROP TABLE IF EXISTS messages", &[]).await?;
        session.query_unpaged("DROP TABLE IF EXISTS conversation_participants", &[]).await?;
        session.query_unpaged("DROP TABLE IF EXISTS conversations", &[]).await?;
        session.query_unpaged("DROP TABLE IF EXISTS users", &[]).await?;
        session.query_unpaged("DROP TABLE IF EXISTS user_conversations", &[]).await?;
        session.query_unpaged("DROP TABLE IF EXISTS one_to_one_conversations", &[]).await?;
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
            is_online BOOLEAN,
            interests TEXT,
            language TEXT,
            profile_image_url TEXT,
            home_country TEXT,
            project_building TEXT
        )",
        &[]
    ).await?;
    
    session.query_unpaged("CREATE INDEX IF NOT EXISTS ON users (username)", &[]).await?;
    session.query_unpaged("CREATE INDEX IF NOT EXISTS ON users (email)", &[]).await?;
    
    session.query_unpaged(
        "CREATE TABLE IF NOT EXISTS conversations (
            conversation_id UUID PRIMARY KEY,
            title TEXT,
            created_at TIMESTAMP,
            updated_at TIMESTAMP,
            one_to_one_key TEXT
        )",
        &[]
    ).await?;

    session.query_unpaged(
        "CREATE TABLE IF NOT EXISTS one_to_one_conversations (
            one_to_one_key TEXT PRIMARY KEY,
            conversation_id UUID
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
            joined_at TIMESTAMP,
            PRIMARY KEY (user_id, conversation_id)
        )",
        &[]
    ).await?;
    
    session.query_unpaged(
        "CREATE TABLE IF NOT EXISTS messages (
            conversation_id UUID,
            message_id TIMEUUID,
            sender_id UUID,
            content TEXT,
            sent_at TIMESTAMP,
            edited_at TIMESTAMP,
            PRIMARY KEY (conversation_id, message_id)
        ) WITH CLUSTERING ORDER BY (message_id ASC)",
        &[]
    ).await?;

    session.query_unpaged(
        "CREATE TABLE IF NOT EXISTS conversation_customization (
            conversation_id UUID,
            user_id UUID,
            background_image_url TEXT,
            primary_message_color TEXT,
            secondary_message_color TEXT,
            text_color_primary TEXT,
            text_color_secondary TEXT,  
            PRIMARY KEY (conversation_id, user_id)
        )",
        &[]
    ).await?;


    session.query_unpaged(
        "CREATE TABLE IF NOT EXISTS groups (
            id UUID PRIMARY KEY,
            name TEXT,
            created_at TIMESTAMP,
            updated_at TIMESTAMP
        )",     
        &[]
    ).await?;

    session.query_unpaged(
        "CREATE TABLE IF NOT EXISTS group_members (
            group_id UUID,
            user_id UUID,
            joined_at TIMESTAMP,
            PRIMARY KEY (group_id, user_id)
        )",
        &[]
    ).await?;

    session.query_unpaged(
        "CREATE TABLE IF NOT EXISTS group_messages (
            group_id UUID,
            message_id TIMEUUID,
            sender_id UUID,
            content TEXT,
            sent_at TIMESTAMP,
            edited_at TIMESTAMP,
            PRIMARY KEY (group_id, message_id)
        ) WITH CLUSTERING ORDER BY (message_id ASC)",
        &[]
    ).await?;


    session.query_unpaged(
        "CREATE TABLE IF NOT EXISTS group_customization (
            group_id UUID,
            user_id UUID,
            background_image_url TEXT,
            primary_message_color TEXT,
            secondary_message_color TEXT,
            text_color_primary TEXT,
            text_color_secondary TEXT,
            photo_url TEXT,
            PRIMARY KEY (group_id, user_id)
        )",
        &[]
    ).await?;

    Ok(())
}
