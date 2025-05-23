use actix_web::web;
use futures::TryStreamExt;
use scylla::{client::session::Session, statement::Statement};
use scylla::value::{CqlTimestamp, CqlTimeuuid};
use uuid::{NoContext, Timestamp, Uuid};
use chrono::Utc;
use bcrypt;
use crate::error::AppError;
use actix_web::http::StatusCode;
use serde::{Deserialize, Serialize};

pub async fn seed_database(session: &web::Data<Session>) -> Result<(), AppError> {
    #[derive(Deserialize, Serialize)]
    struct SeedUser {
        username: String,
        email: String,
        password: String,
    }

    let users: Vec<SeedUser> = vec![
        SeedUser {
            username: "john_doe".to_string(),
            email: "john@example.com".to_string(),
            password: "password123".to_string(),
        },
        SeedUser {
            username: "jane_smith".to_string(),
            email: "jane@example.com".to_string(),
            password: "password456".to_string(),
        },
        SeedUser {
            username: "bob_wilson".to_string(),
            email: "bob@example.com".to_string(),
            password: "password789".to_string(),
        },
        SeedUser {
            username: "alice_brown".to_string(),
            email: "alice@example.com".to_string(),
            password: "password101".to_string(),
        },
        SeedUser {
            username: "charlie_davis".to_string(),
            email: "charlie@example.com".to_string(),
            password: "password202".to_string(),
        },
    ];

    let now = Utc::now().timestamp();

    for user in users {
        let id = Uuid::new_v4();
        let password_hash = bcrypt::hash(&user.password, bcrypt::DEFAULT_COST)
            .map_err(|e| AppError(format!("Password hashing error: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;

        session.query_unpaged(
            "INSERT INTO users (id, username, email, password_hash, created_at, updated_at, last_seen_at, is_online) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (
                id,
                user.username,
                user.email,
                password_hash,
                CqlTimestamp(now),
                CqlTimestamp(now),
                CqlTimestamp(now),
                false,
            ),
        ).await.map_err(|e| AppError(format!("Failed to insert user: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;
    }

    let stm = Statement::new("SELECT * FROM users");

    let mut user_ids = session.query_iter(stm, ()).await
        .map_err(|e| AppError(format!("Failed to stream users: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?
        .rows_stream::<(Uuid, CqlTimestamp, String, bool, CqlTimestamp, String, CqlTimestamp, String)>()
        .map_err(|e| AppError(format!("Failed to stream messages: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;

    let mut user_pairs = Vec::new();
    while let Some((id, _, _, _, _, _, _, _)) = user_ids.try_next().await
        .map_err(|e| AppError(format!("Failed to process user: {}", e), StatusCode::INTERNAL_SERVER_ERROR))? {
        user_pairs.push(id);
    }

    for i in (0..user_pairs.len()).step_by(2) {
        if i + 1 >= user_pairs.len() {
            break;
        }

        let conversation_id = Uuid::new_v4();
        let one_to_one_key = format!("{}:{}", 
            user_pairs[i].to_string(), 
            user_pairs[i + 1].to_string()
        );

        session.query_unpaged(
            "INSERT INTO conversations (conversation_id, title, created_at, updated_at, one_to_one_key) 
             VALUES (?, ?, ?, ?, ?)",
            (
                conversation_id,
                format!("Chat between users {} and {}", i + 1, i + 2),
                CqlTimestamp(now),
                CqlTimestamp(now),
                one_to_one_key.clone(),
            ),
        ).await.map_err(|e| AppError(format!("Failed to create conversation: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;

        session.query_unpaged(
            "INSERT INTO one_to_one_conversations (one_to_one_key, conversation_id) 
             VALUES (?, ?)",
            (one_to_one_key, conversation_id),
        ).await.map_err(|e| AppError(format!("Failed to create one-to-one mapping: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;

        for user_id in &user_pairs[i..=i+1] {
            session.query_unpaged(
                "INSERT INTO conversation_participants (conversation_id, user_id, joined_at) 
                 VALUES (?, ?, ?)",
                (conversation_id, user_id, CqlTimestamp(now)),
            ).await.map_err(|e| AppError(format!("Failed to add participant: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;

            session.query_unpaged(
                "INSERT INTO user_conversations (user_id, conversation_id, joined_at) 
                 VALUES (?, ?, ?)",
                (user_id, conversation_id, CqlTimestamp(now)),
            ).await.map_err(|e| AppError(format!("Failed to add user conversation: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;
        }

        let messages = vec![
            "Hello! How are you?",
            "I'm doing great, thanks for asking!",
            "What have you been up to?",
            "Just working on some projects. How about you?",
        ];

        for (index, content) in messages.iter().enumerate() {
            let now = Utc::now();
            let message_timestamp = now.timestamp() + (index as i64 * 60);
            
            let message_id = Uuid::new_v1(
                Timestamp::from_unix(&NoContext, message_timestamp as u64, 0),
                &[1, 2, 3, 4, 5, 6],
            );
            
            let sender_id = if index % 2 == 0 { user_pairs[i] } else { user_pairs[i + 1] };

            session.query_unpaged(
                "INSERT INTO messages (conversation_id, message_id, sender_id, content, sent_at, edited_at) 
                 VALUES (?, ?, ?, ?, ?, ?)",
                (
                    conversation_id,
                    CqlTimeuuid::from_bytes(*message_id.as_bytes()),
                    sender_id,
                    content.to_string(), 
                    CqlTimestamp(message_timestamp),
                    CqlTimestamp(message_timestamp),
                ),
            ).await.map_err(|e| AppError(format!("Failed to insert message: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;
        }
    }

    Ok(())
}