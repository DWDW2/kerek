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
        session.query_unpaged("DROP TABLE IF EXISTS user_languages", &[]).await?;
        session.query_unpaged("DROP TABLE IF EXISTS language_partner_requests", &[]).await?;
        session.query_unpaged("DROP TABLE IF EXISTS language_challenges", &[]).await?;
        session.query_unpaged("DROP TABLE IF EXISTS user_challenge_progress", &[]).await?;
        session.query_unpaged("DROP TABLE IF EXISTS achievements", &[]).await?;
        session.query_unpaged("DROP TABLE IF EXISTS user_achievements", &[]).await?;
        session.query_unpaged("DROP TABLE IF EXISTS cultural_topics", &[]).await?;
        session.query_unpaged("DROP TABLE IF EXISTS message_corrections", &[]).await?;
        session.query_unpaged("DROP TABLE IF EXISTS user_statistics", &[]).await?;
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
            language TEXT
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
        "CREATE TABLE IF NOT EXISTS user_languages (
            user_id UUID,
            language_code TEXT,
            proficiency_level TEXT,
            is_native BOOLEAN,
            learning_since TIMESTAMP,
            PRIMARY KEY (user_id, language_code)
        )",
        &[]
    ).await?;
    
    session.query_unpaged(
        "CREATE TABLE IF NOT EXISTS language_partner_requests (
            request_id UUID PRIMARY KEY,
            requester_id UUID,
            recipient_id UUID,
            status TEXT,
            requested_at TIMESTAMP,
            updated_at TIMESTAMP
        )",
        &[]
    ).await?;
    
    session.query_unpaged(
        "CREATE INDEX IF NOT EXISTS ON language_partner_requests (requester_id)",
        &[]
    ).await?;
    
    session.query_unpaged(
        "CREATE INDEX IF NOT EXISTS ON language_partner_requests (recipient_id)",
        &[]
    ).await?;
    
    session.query_unpaged(
        "CREATE TABLE IF NOT EXISTS language_challenges (
            challenge_id UUID PRIMARY KEY,
            title TEXT,
            description TEXT,
            language_code TEXT,
            difficulty_level TEXT,
            points INT,
            created_at TIMESTAMP,
            expires_at TIMESTAMP
        )",
        &[]
    ).await?;
    
    session.query_unpaged(
        "CREATE INDEX IF NOT EXISTS ON language_challenges (language_code)",
        &[]
    ).await?;
    
    session.query_unpaged(
        "CREATE TABLE IF NOT EXISTS user_challenge_progress (
            user_id UUID,
            challenge_id UUID,
            status TEXT,
            started_at TIMESTAMP,
            completed_at TIMESTAMP,
            PRIMARY KEY (user_id, challenge_id)
        )",
        &[]
    ).await?;
    
    session.query_unpaged(
        "CREATE TABLE IF NOT EXISTS achievements (
            achievement_id UUID PRIMARY KEY,
            title TEXT,
            description TEXT,
            points INT,
            badge_image_url TEXT,
            criteria TEXT
        )",
        &[]
    ).await?;
    
    session.query_unpaged(
        "CREATE TABLE IF NOT EXISTS user_achievements (
            user_id UUID,
            achievement_id UUID,
            earned_at TIMESTAMP,
            PRIMARY KEY (user_id, achievement_id)
        )",
        &[]
    ).await?;
    
    session.query_unpaged(
        "CREATE TABLE IF NOT EXISTS cultural_topics (
            topic_id UUID PRIMARY KEY,
            title TEXT,
            description TEXT,
            language_code TEXT,
            category TEXT,
            created_at TIMESTAMP
        )",
        &[]
    ).await?;
    
    session.query_unpaged(
        "CREATE INDEX IF NOT EXISTS ON cultural_topics (language_code)",
        &[]
    ).await?;
    
    session.query_unpaged(
        "CREATE TABLE IF NOT EXISTS message_corrections (
            message_id TIMEUUID,
            corrector_id UUID,
            original_content TEXT,
            corrected_content TEXT,
            correction_notes TEXT,
            corrected_at TIMESTAMP,
            PRIMARY KEY (message_id, corrector_id)
        )",
        &[]
    ).await?;
    
    session.query_unpaged(
        "CREATE TABLE IF NOT EXISTS user_statistics (
            user_id UUID PRIMARY KEY,
            messages_sent INT,
            corrections_given INT,
            corrections_received INT,
            challenges_completed INT,
            achievements_earned INT,
            total_points INT,
            last_updated TIMESTAMP
        )",
        &[]
    ).await?;
    Ok(())
}
