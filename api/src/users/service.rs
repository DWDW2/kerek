use actix_web::web;
use scylla::client::session::Session;
use actix_web::http::StatusCode;
use scylla::value::CqlTimestamp;
use uuid::Uuid;
use chrono::Utc;
use std::marker::PhantomData;
use crate::{
    error::AppError, 
    models::user::{NewUser, User, UserProfile},
    utils::db_client::DbClient
};

pub async fn create(session: &web::Data<Session>, new_user: NewUser) -> Result<User, AppError> {
    let id = Uuid::new_v4();
    let now = Utc::now().timestamp();
    let password_hash = bcrypt::hash(&new_user.password, bcrypt::DEFAULT_COST)
        .map_err(|e| AppError(format!("Password hashing error: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;

    let db_client = DbClient::<User> { 
        session, 
        _phantom: PhantomData 
    };  

    db_client.insert(
        "INSERT INTO users (id, username, email, password_hash, created_at, updated_at, last_seen_at, is_online, interests, language, profile_image_url, home_country, project_building) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (
            &id, 
            &new_user.username, 
            &new_user.email, 
            &password_hash, 
            CqlTimestamp(now), 
            CqlTimestamp(now), 
            None::<CqlTimestamp>, 
            false, 
            &new_user.interests, 
            &new_user.language,
            &new_user.profile_image_url,
            &new_user.home_country,
            &new_user.project_building
        )
    ).await?;

    Ok(User::new(
        id.to_string(),
        new_user.username,
        new_user.email,
        password_hash,
        new_user.interests,
        new_user.language,
        new_user.profile_image_url,
        new_user.home_country,
        new_user.project_building
    ))
}

pub async fn find_by_email(session: &web::Data<Session>, email: &str) -> Result<Option<User>, AppError> {
    let db_client = DbClient::<User> { 
        session, 
        _phantom: PhantomData 
    };

    let results = db_client.query::<(Uuid, String, String, String, CqlTimestamp, CqlTimestamp, Option<CqlTimestamp>, bool, Option<String>, Option<String>, Option<String>, Option<String>, Option<String>), _>(
        "SELECT id, username, email, password_hash, created_at, updated_at, last_seen_at, is_online, interests, language, profile_image_url, home_country, project_building FROM users WHERE email = ?",
        Some((email,))
    ).await?;

    if let Some(row) = results.first() {
        let (id, username, email, password_hash, created_at, updated_at, last_seen_at, is_online, interests, language, profile_image_url, home_country, project_building) = row.clone();
        Ok(Some(User {
            id: id.to_string(),
            username,
            email,
            password_hash,
            created_at: created_at.0,
            updated_at: updated_at.0,   
            last_seen_at: last_seen_at.map(|ts| ts.0),
            is_online,
            interests,
            language,
            profile_image_url,
            home_country,
            project_building,
        }))
    } else {
        Ok(None)
    }
}

pub async fn find_by_id(session: &web::Data<Session>, id: &str) -> Result<Option<User>, AppError> {
    let uuid = Uuid::parse_str(id).map_err(|e| AppError(format!("Invalid UUID format: {}", e), StatusCode::BAD_REQUEST))?;
    
    let db_client = DbClient::<User> { 
        session, 
        _phantom: PhantomData 
    };

    let results = db_client.query::<(Uuid, String, String, String, CqlTimestamp, CqlTimestamp, Option<CqlTimestamp>, bool, Option<String>, Option<String>, Option<String>, Option<String>, Option<String>), _>(
        "SELECT id, username, email, password_hash, created_at, updated_at, last_seen_at, is_online, interests, language, profile_image_url, home_country, project_building FROM users WHERE id = ?",
        Some((uuid,))
    ).await?;

    if let Some(row) = results.first() {
        let (id, username, email, password_hash, created_at, updated_at, last_seen_at, is_online, interests, language, profile_image_url, home_country, project_building) = row.clone();
        Ok(Some(User {
            id: id.to_string(),
            username,
            email,
            password_hash,
            created_at: created_at.0,
            updated_at: updated_at.0,
            last_seen_at: last_seen_at.map(|ts| ts.0),
            is_online,
            interests,
            language,
            profile_image_url,
            home_country,
            project_building,
        }))
    } else {
        Ok(None)
    }
}

pub async fn update_profile(session: &web::Data<Session>, id: &str, update_data: crate::models::user::UpdateProfileRequest) -> Result<User, AppError> {
    let uuid = Uuid::parse_str(id).map_err(|e| AppError(format!("Invalid UUID format: {}", e), StatusCode::BAD_REQUEST))?;
    let now = Utc::now().timestamp();


    let current_user = find_by_id(session, id).await?
        .ok_or_else(|| AppError("User not found".to_string(), StatusCode::NOT_FOUND))?;

    let db_client = DbClient::<User> { 
        session, 
        _phantom: PhantomData 
    };

    db_client.insert(
        "UPDATE users SET username = ?, email = ?, interests = ?, language = ?, profile_image_url = ?, home_country = ?, project_building = ?, updated_at = ? WHERE id = ?",
        (
            update_data.username.as_ref().unwrap_or(&current_user.username),
            update_data.email.as_ref().unwrap_or(&current_user.email),
            &update_data.interests.or(current_user.interests),
            &update_data.language.or(current_user.language),
            &update_data.profile_image_url.or(current_user.profile_image_url),
            &update_data.home_country.or(current_user.home_country),
            &update_data.project_building.or(current_user.project_building),
            CqlTimestamp(now),
            uuid
        )
    ).await?;
        
    if let Some(password) = &update_data.password {
        let password_hash = bcrypt::hash(password, bcrypt::DEFAULT_COST)
            .map_err(|e| AppError(format!("Password hashing error: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;
        
        db_client.insert(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            (&password_hash, uuid)
        ).await?;
    }

    match find_by_id(session, id).await? {
        Some(user) => Ok(user),
        None => Err(AppError("Failed to retrieve updated user".to_string(), StatusCode::INTERNAL_SERVER_ERROR)),
    }
}

pub async fn update_user(session: &web::Data<Session>, id: &str, updated_user: NewUser) -> Result<User, AppError> {
    let uuid = Uuid::parse_str(id).map_err(|e| AppError(format!("Invalid UUID format: {}", e), StatusCode::BAD_REQUEST))?;
    let now = Utc::now().timestamp();
    let password_hash = bcrypt::hash(&updated_user.password, bcrypt::DEFAULT_COST)
        .map_err(|e| AppError(format!("Password hashing error: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;

    let db_client = DbClient::<User> { 
        session, 
        _phantom: PhantomData 
    };

    db_client.insert(
        "UPDATE users SET username = ?, email = ?, password_hash = ?, updated_at = ? WHERE id = ?",
        (&updated_user.username, &updated_user.email, &password_hash, CqlTimestamp(now), uuid)
    ).await?;

    match find_by_id(session, id).await? {
        Some(user) => Ok(user),
        None => Err(AppError("Failed to retrieve updated user".to_string(), StatusCode::INTERNAL_SERVER_ERROR)),
    }
}

pub async fn update_user_status(session: &web::Data<Session>, id: &str, is_online: bool) -> Result<(), AppError> {
    let uuid = Uuid::parse_str(id).map_err(|e| AppError(format!("Invalid UUID format: {}", e), StatusCode::BAD_REQUEST))?;
    let now = Utc::now().timestamp();

    let db_client = DbClient::<User> { 
        session, 
        _phantom: PhantomData 
    };

    db_client.insert(
        "UPDATE users SET is_online = ?, last_seen_at = ? WHERE id = ?",
        (is_online, CqlTimestamp(now), uuid)
    ).await
}

pub async fn delete_user(session: &web::Data<Session>, id: &str) -> Result<(), AppError> {
    let uuid = Uuid::parse_str(id).map_err(|e| AppError(format!("Invalid UUID format: {}", e), StatusCode::BAD_REQUEST))?;

    let db_client = DbClient::<User> { 
        session, 
        _phantom: PhantomData 
    };

    db_client.insert(
        "DELETE FROM users WHERE id = ?",
        (uuid,)
    ).await
}

pub async fn search_users(
    session: &web::Data<Session>,
    query: &str,
) -> Result<Vec<UserProfile>, AppError> {
    let db_client = DbClient::<UserProfile> { 
        session, 
        _phantom: PhantomData 
    };

    let results = db_client.query::<(Uuid, String, String, CqlTimestamp, Option<CqlTimestamp>, bool, String, String), _>(
        "SELECT id, username, email, created_at, last_seen_at, is_online, interests, language FROM users",
        None::<()>
    ).await?;
    log::debug!("Results: {:?}", results);
    let users = results
        .into_iter()
        .filter(|(_, username, email, _, _, _, _, _)| username.contains(query) || email.contains(query))
        .map(|(id, username, email, created_at, last_seen_at, is_online, interests, language)| {
            UserProfile {
                id: id.to_string(),
                username,
                email,
                created_at: created_at.0,
                last_seen_at: last_seen_at.map(|ts| ts.0),
                is_online,
                interests: Some(interests),
                language: Some(language),
                profile_image_url: None,
                home_country: None,
                project_building: None,
            }
        })
        .collect();
    
    Ok(users)
}

pub async fn get_all_users(session: &web::Data<Session>) -> Result<Vec<UserProfile>, AppError> {
    let db_client = DbClient::<UserProfile> { 
        session, 
        _phantom: PhantomData 
    };

    let results = db_client.query::<(Uuid, String, String, CqlTimestamp, Option<CqlTimestamp>, bool, Option<String>, Option<String>, Option<String>, Option<String>, Option<String>), _>(
        "SELECT id, username, email, created_at, last_seen_at, is_online, interests, language, profile_image_url, home_country, project_building FROM users",
        None::<()>
    ).await?;

    let users = results
        .into_iter()
        .map(|(id, username, email, created_at, last_seen_at, is_online, interests, language, profile_image_url, home_country, project_building)| {
            UserProfile {
                id: id.to_string(),
                username,
                email,
                created_at: created_at.0,
                last_seen_at: last_seen_at.map(|ts| ts.0),
                is_online,
                interests,
                language,
                profile_image_url,
                home_country,
                project_building,
            }   
        })  
        .collect();

    Ok(users)
}
