use actix_web::{web, HttpResponse, Responder};
use bcrypt::verify;
use jsonwebtoken::{encode, Header, EncodingKey};
use chrono::{Utc, Duration};
use scylla::client::session::Session;
use crate::error::AppError;
use crate::models::user::{NewUser, LoginRequest, AuthResponse, UpdateProfileRequest};
use serde::{Serialize, Deserialize};
use crate::users::service;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,  
    pub exp: i64,      
}

pub async fn register(
    session: web::Data<Session>,
    new_user: web::Json<NewUser>,
) -> Result<impl Responder, AppError> {
    if let Some(_) = service::find_by_email(&session, &new_user.email).await? {
        return Err(AppError("User with this email already exists".to_string(), actix_web::http::StatusCode::CONFLICT));
    }

    let user = service::create(&session, new_user.into_inner()).await?;

    let token = generate_token(&user.id)?;
    
    Ok(HttpResponse::Created().json(AuthResponse {
        token,
        user: user,
    }))
}

pub async fn login(
    session: web::Data<Session>,
    credentials: web::Json<LoginRequest>,
) -> Result<impl Responder, AppError> {
    let user = service::find_by_email(&session, &credentials.email).await?
        .ok_or_else(|| AppError("Invalid email or password".to_string(), actix_web::http::StatusCode::UNAUTHORIZED))?;

    if !verify(&credentials.password, &user.password_hash)
        .map_err(|_| AppError("Invalid email or password".to_string(), actix_web::http::StatusCode::UNAUTHORIZED))? {
        return Err(AppError("Invalid email or password".to_string(), actix_web::http::StatusCode::UNAUTHORIZED));
    }

    service::update_user_status(&session, &user.id, true).await?;

    let token = generate_token(&user.id)?;
    
    Ok(HttpResponse::Ok().json(AuthResponse {
        token,
        user: user,
    }))
}
pub async fn get_profile(
    session: web::Data<Session>,
    claims: web::Json<Claims>,
) -> Result<impl Responder, AppError> {
    let user = service::find_by_id(&session, &claims.sub).await?
        .ok_or_else(|| AppError("User not found".to_string(), actix_web::http::StatusCode::NOT_FOUND))?;

    Ok(HttpResponse::Ok().json(user.to_profile()))
}

pub async fn update_profile(
    session: web::Data<Session>,
    claims: web::Json<Claims>,
    update_data: web::Json<UpdateProfileRequest>,
) -> Result<impl Responder, AppError> {
    let user = service::find_by_id(&session, &claims.sub).await?
        .ok_or_else(|| AppError("User not found".to_string(), actix_web::http::StatusCode::NOT_FOUND))?;

    let updated_user = NewUser {
        username: update_data.username.clone().unwrap_or(user.username),
        email: update_data.email.clone().unwrap_or(user.email),
        password: update_data.password.clone().unwrap_or(user.password_hash),
    };

    let updated = service::update_user(&session, &user.id, updated_user).await?;

    Ok(HttpResponse::Ok().json(updated.to_profile()))
}

pub async fn search_users(
    session: web::Data<Session>,
    query: web::Query<SearchQuery>,
) -> Result<impl Responder, AppError> {
    let users = service::search_users(&session, &query.q).await?;
    Ok(HttpResponse::Ok().json(users))
}

pub async fn logout(
    session: web::Data<Session>,
    claims: web::Json<Claims>,  
) -> Result<impl Responder, AppError> {
    service::update_user_status(&session, &claims.sub, false).await?;
    Ok(HttpResponse::Ok().finish())
}

#[derive(serde::Deserialize)]
pub struct SearchQuery {
    q: String,
}

fn generate_token(user_id: &str) -> Result<String, AppError> {
    let expiration = Utc::now()
        .checked_add_signed(Duration::hours(24))
        .expect("valid timestamp")
        .timestamp();

    let claims = Claims {
        sub: user_id.to_owned(),
        exp: expiration,
    };

    let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "your-secret-key".to_string());
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    ).map_err(|e| AppError(format!("Token generation error: {}", e), actix_web::http::StatusCode::INTERNAL_SERVER_ERROR))
}