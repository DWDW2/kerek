use actix_web::{web, HttpResponse,};
use bcrypt::{hash, verify, DEFAULT_COST};
use jsonwebtoken::{encode, Header, EncodingKey, Algorithm};
use chrono::{Utc, Duration};
use std::env;
use scylla::client::session::Session;
use crate::error::AppError;
use crate::models::user::{NewUser, LoginRequest, AuthResponse, User, UpdateProfileRequest};
use crate::db;
use serde::Serialize;
use actix_web::http::StatusCode;

#[derive(Debug, Serialize)]
struct Claims {
    sub: String,
    exp: usize,
}

pub async fn register(
    session: web::Data<Session>,
    user_data: web::Json<LoginRequest>,
) -> Result<HttpResponse, AppError> {
    if let Ok(Some(_)) = db::users::find_by_email(&session, &user_data.email).await {
        return Err(AppError("Email already registered".to_string(), StatusCode::BAD_REQUEST));
    }
    let password_hash = hash(&user_data.password, DEFAULT_COST)
        .map_err(|e| AppError(format!("Password hashing error: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;
    
    let new_user = NewUser {
        username: user_data.email.split('@').next().unwrap_or("user").to_string(),
        email: user_data.email.clone(),
        password_hash,
    };  
    
    let user = db::users::create(&session, new_user).await.map_err(|e| AppError(format!("Database error: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;
    
    let token = create_token(&user)?;
    
    Ok(HttpResponse::Created().json(AuthResponse {
        token,
        user,
    }))
}

pub async fn login(
    session: web::Data<Session>,
    login_data: web::Json<LoginRequest>,
) -> Result<HttpResponse, AppError> {
    let user = match db::users::find_by_email(&session, &login_data.email).await {
        Ok(Some(user)) => user,
        Ok(None) => return Err(AppError("Invalid email or password".to_string(), StatusCode::UNAUTHORIZED)),
        Err(e) => return Err(AppError(format!("Database error: {}", e), StatusCode::INTERNAL_SERVER_ERROR)),
    };  
    
    let is_valid = verify(&login_data.password, &user.password_hash)
        .map_err(|e| AppError(format!("Password verification error: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;
    
    if !is_valid {
        return Err(AppError("Invalid email or password".to_string(), StatusCode::UNAUTHORIZED));
    }   
    
    let token = create_token(&user)?;
    
    Ok(HttpResponse::Ok().json(AuthResponse {
        token,
        user,
    }))
}

fn create_token(user: &User) -> Result<String, AppError> {
    let secret = env::var("JWT_SECRET").unwrap_or_else(|_| "default_secret".to_string());
    let expiration = Utc::now() + Duration::days(7);
    
    let claims = Claims {
        sub: user.id.to_string(),
        exp: expiration.timestamp() as usize,
    };
    
    encode(
        &Header::new(Algorithm::HS256),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|e| AppError(format!("Token generation error: {}", e), StatusCode::INTERNAL_SERVER_ERROR))
}

pub async fn get_profile(
    session: web::Data<Session>,
    user_id: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let user = match db::users::find_by_id(&session, &user_id).await {
        Ok(Some(user)) => user,
        Ok(None) => return Err(AppError("User not found".to_string(), StatusCode::NOT_FOUND)),
        Err(e) => return Err(AppError(format!("Database error: {}", e), StatusCode::INTERNAL_SERVER_ERROR)),
    };

    // Remove sensitive information before sending response
    let user_response = User {
        password_hash: String::new(), // Don't send password hash
        ..user
    };

    Ok(HttpResponse::Ok().json(user_response))
}

pub async fn update_profile(
    session: web::Data<Session>,
    user_id: web::Path<String>,
    update_data: web::Json<UpdateProfileRequest>,
) -> Result<HttpResponse, AppError> {
    // First verify the user exists
    let existing_user = match db::users::find_by_id(&session, &user_id).await {
        Ok(Some(user)) => user,
        Ok(None) => return Err(AppError("User not found".to_string(), StatusCode::NOT_FOUND)),
        Err(e) => return Err(AppError(format!("Database error: {}", e), StatusCode::INTERNAL_SERVER_ERROR)),
    };

    // If password is being updated, hash it
    let password_hash = if let Some(new_password) = &update_data.password {
        hash(new_password, DEFAULT_COST)
            .map_err(|e| AppError(format!("Password hashing error: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?
    } else {
        existing_user.password_hash
    };

    let updated_user = NewUser {
        username: update_data.username.clone().unwrap_or(existing_user.username),
        email: update_data.email.clone().unwrap_or(existing_user.email),
        password_hash,
    };

    let user = db::users::update_user(&session, &user_id, updated_user).await?;

    let user_response = User {
        password_hash: String::new(),
        ..user
    };

    Ok(HttpResponse::Ok().json(user_response))
}

pub async fn search_users(
    session: web::Data<Session>,
    query: web::Query<SearchQuery>,
) -> Result<HttpResponse, AppError> {
    let users = db::users::search_users(&session, &query.q).await?;


    let users_response: Vec<User> = users
        .into_iter()
        .map(|user| User {
            password_hash: String::new(), 
            ..user
        })
        .collect();

    Ok(HttpResponse::Ok().json(users_response))
}

#[derive(serde::Deserialize)]
pub struct SearchQuery {
    q: String,
}