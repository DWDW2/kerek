use actix_web::web;
use scylla::client::session::Session;
use futures_util::stream::TryStreamExt;
use actix_web::http::StatusCode;
use scylla::value::CqlTimestamp;
use uuid::Uuid;
use scylla::statement::unprepared::Statement;
use chrono::Utc;
use crate::{error::AppError, models::user::{NewUser, User, UserProfile}};

pub async fn create(session: &web::Data<Session>, new_user: NewUser) -> Result<User, AppError> {
    let id = Uuid::new_v4();
    let now = Utc::now().timestamp();
    let password_hash = bcrypt::hash(&new_user.password, bcrypt::DEFAULT_COST)
        .map_err(|e| AppError(format!("Password hashing error: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;

    let statement = Statement::new("INSERT INTO users (id, username, email, password_hash, created_at, updated_at, last_seen_at, is_online) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    session.query_unpaged(
        statement,
        (&id, &new_user.username, &new_user.email, &password_hash, CqlTimestamp(now), CqlTimestamp(now), None::<CqlTimestamp>, false)
    ).await.map_err(|e| AppError(format!("Failed to create user: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;
    
    Ok(User {
        id: id.to_string(),
        username: new_user.username,
        email: new_user.email,
        password_hash,
        created_at: now,
        updated_at: now,
        last_seen_at: None,
        is_online: false,
    })
}

pub async fn find_by_email(session: &web::Data<Session>, email: &str) -> Result<Option<User>, AppError> {
    let mut iter = session.query_iter(
        "SELECT id, username, email, password_hash, created_at, updated_at, last_seen_at, is_online FROM users WHERE email = ?",
        (email,),
    ).await.map_err(|e| AppError(format!("Failed to prepare query: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?
        .rows_stream::<(Uuid, String, String, String, CqlTimestamp, CqlTimestamp, Option<CqlTimestamp>, bool)>()
        .map_err(|e| AppError(format!("Failed to get rows stream: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;

    match iter.try_next().await {
        Ok(Some(row)) => {
            let (id, username, email, password_hash, created_at, updated_at, last_seen_at, is_online) = row;
            Ok(Some(User {
                id: id.to_string(),
                username,
                email,
                password_hash,
                created_at: created_at.0,
                updated_at: updated_at.0,
                last_seen_at: last_seen_at.map(|ts| ts.0),
                is_online,
            }))
        }
        Ok(None) => Ok(None),
        Err(e) => Err(AppError(format!("Failed to find user by email: {}", e), StatusCode::INTERNAL_SERVER_ERROR)),
    }
}

pub async fn find_by_id(session: &web::Data<Session>, id: &str) -> Result<Option<User>, AppError> {
    let uuid = Uuid::parse_str(id).map_err(|e| AppError(format!("Invalid UUID format: {}", e), StatusCode::BAD_REQUEST))?;

    let mut iter = session.query_iter(
        "SELECT id, username, email, password_hash, created_at, updated_at, last_seen_at, is_online FROM users WHERE id = ?",
        (uuid,),
    ).await.map_err(|e| AppError(format!("Failed to prepare query: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?
        .rows_stream::<(Uuid, String, String, String, CqlTimestamp, CqlTimestamp, Option<CqlTimestamp>, bool)>()
        .map_err(|e| AppError(format!("Failed to get rows stream: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;

    match iter.try_next().await {
        Ok(Some(row)) => {
            let (id, username, email, password_hash, created_at, updated_at, last_seen_at, is_online) = row;
            Ok(Some(User {
                id: id.to_string(),
                username,
                email,
                password_hash,
                created_at: created_at.0,
                updated_at: updated_at.0,
                last_seen_at: last_seen_at.map(|ts| ts.0),
                is_online,
            }))
        }
        Ok(None) => Ok(None),
        Err(e) => Err(AppError(format!("Failed to find user by id: {}", e), StatusCode::INTERNAL_SERVER_ERROR)),
    }
}

pub async fn update_user(session: &web::Data<Session>, id: &str, updated_user: NewUser) -> Result<User, AppError> {
    let uuid = Uuid::parse_str(id).map_err(|e| AppError(format!("Invalid UUID format: {}", e), StatusCode::BAD_REQUEST))?;
    let now = Utc::now().timestamp();
    let password_hash = bcrypt::hash(&updated_user.password, bcrypt::DEFAULT_COST)
        .map_err(|e| AppError(format!("Password hashing error: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;

    session.query_unpaged(
        "UPDATE users SET username = ?, email = ?, password_hash = ?, updated_at = ? WHERE id = ?",
        (&updated_user.username, &updated_user.email, &password_hash, CqlTimestamp(now), uuid),
    ).await.map_err(|e| AppError(format!("Failed to update user: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;

    match find_by_id(session, id).await? {
        Some(user) => Ok(user),
        None => Err(AppError("Failed to retrieve updated user".to_string(), StatusCode::INTERNAL_SERVER_ERROR)),
    }
}

pub async fn update_user_status(session: &web::Data<Session>, id: &str, is_online: bool) -> Result<(), AppError> {
    let uuid = Uuid::parse_str(id).map_err(|e| AppError(format!("Invalid UUID format: {}", e), StatusCode::BAD_REQUEST))?;
    let now = Utc::now().timestamp();

    session.query_unpaged(
        "UPDATE users SET is_online = ?, last_seen_at = ? WHERE id = ?",
        (is_online, CqlTimestamp(now), uuid),
    ).await.map_err(|e| AppError(format!("Failed to update user status: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;

    Ok(())
}

pub async fn delete_user(session: &web::Data<Session>, id: &str) -> Result<(), AppError> {
    let uuid = Uuid::parse_str(id).map_err(|e| AppError(format!("Invalid UUID format: {}", e), StatusCode::BAD_REQUEST))?;

    session.query_unpaged(
        "DELETE FROM users WHERE id = ?",
        (uuid,),
    ).await.map_err(|e| AppError(format!("Failed to delete user: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;

    Ok(())
}

pub async fn search_users(session: &web::Data<Session>, query: &str) -> Result<Vec<UserProfile>, AppError> {
    let search_pattern = format!("%{}%", query);
    
    let mut iter = session.query_iter(
        "SELECT id, username, email, created_at, last_seen_at, is_online FROM users WHERE username LIKE ? OR email LIKE ? LIMIT 20",
        (&search_pattern, &search_pattern),
    ).await.map_err(|e| AppError(format!("Failed to prepare search query: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?
        .rows_stream::<(Uuid, String, String, CqlTimestamp, Option<CqlTimestamp>, bool)>()
        .map_err(|e| AppError(format!("Failed to get rows stream: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;

    let mut users = Vec::new();
    while let Some(row) = iter.try_next().await.map_err(|e| AppError(format!("Failed to process search results: {}", e), StatusCode::INTERNAL_SERVER_ERROR))? {
        let (id, username, email, created_at, last_seen_at, is_online) = row;
        users.push(UserProfile {
            id: id.to_string(),
            username,
            email,
            created_at: created_at.0,
            last_seen_at: last_seen_at.map(|ts| ts.0),
            is_online,
        });
    }

    Ok(users)
}
