use actix_web::{web, HttpRequest, HttpResponse, Responder};
use bcrypt::verify;
use jsonwebtoken::{encode, Header, EncodingKey};
use chrono::{Utc, Duration};
use scylla::client::session::Session;
use serde_json::json;
use crate::error::AppError;
use crate::models::user::{NewUser, LoginRequest, AuthResponse, UpdateProfileRequest};
use crate::utils::jwt::get_user_id_from_token;
use serde::{Serialize, Deserialize};
use crate::users::service;

#[derive(Debug, Serialize, Deserialize)]
pub struct UserId {
    pub id: String,
}

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
    log::info!("User: {:?}", user);
    if !verify(&credentials.password, &user.password_hash)
        .map_err(|_| AppError("Invalid email or password".to_string(), actix_web::http::StatusCode::UNAUTHORIZED))? {
        return Err(AppError("Invalid email or password".to_string(), actix_web::http::StatusCode::UNAUTHORIZED));
    }

    service::update_user_status(&session, &user.id, true).await?;

    let token = generate_token(&user.id)?;
    log::info!("Token: {:?}", token);
    Ok(HttpResponse::Ok().json(AuthResponse {
        token,
        user: user,
    }))
}

pub async fn get_profile(
    session: web::Data<Session>,
    user_id: web::Path<String>
) -> Result<impl Responder, AppError> {
    let user = service::find_by_id(&session, &user_id).await?
        .ok_or_else(|| AppError("User not found".to_string(), actix_web::http::StatusCode::NOT_FOUND))?;

    Ok(HttpResponse::Ok().json(user.to_profile()))
}

pub async fn update_profile(
    session: web::Data<Session>,
    req: HttpRequest,
    update_data: web::Json<UpdateProfileRequest>,
) -> Result<impl Responder, AppError> {
    let user_id = get_user_id_from_token(&req)?;
    let updated = service::update_profile(&session, &user_id, update_data.into_inner()).await?;
    log::debug!("Updated user: {:?}", updated);
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
    user_id: web::Json<UserId>,  
) -> Result<impl Responder, AppError> {
    service::update_user_status(&session, &user_id.id, false).await?;
    Ok(HttpResponse::Ok().finish())
}

pub async fn get_me(
    session: web::Data<Session>,
    req: HttpRequest,
) -> Result<impl Responder, AppError> {
    let auth_header = req.headers()
        .get("Authorization")
        .ok_or_else(|| AppError("Missing Authorization header".to_string(), actix_web::http::StatusCode::UNAUTHORIZED))?
        .to_str()
        .map_err(|_| AppError("Invalid Authorization header".to_string(), actix_web::http::StatusCode::UNAUTHORIZED))?;

    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or_else(|| AppError("Invalid token format".to_string(), actix_web::http::StatusCode::UNAUTHORIZED))?;

    let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "your-secret-key".to_string());
    let validation = jsonwebtoken::Validation::default();
    
    let claims = jsonwebtoken::decode::<Claims>(
        token,
        &jsonwebtoken::DecodingKey::from_secret(secret.as_bytes()),
        &validation,
    )
    .map_err(|e| AppError(format!("Invalid token: {}", e), actix_web::http::StatusCode::UNAUTHORIZED))?
    .claims;

    let user = service::find_by_id(&session, &claims.sub).await?
        .ok_or_else(|| AppError("User not found".to_string(), actix_web::http::StatusCode::NOT_FOUND))?;

    Ok(HttpResponse::Ok().json(user.to_profile()))
}

pub async fn get_all_users(
    session: web::Data<Session>,
) -> Result<impl Responder, AppError> {
    let users = service::get_all_users(&session).await?;
    Ok(HttpResponse::Ok().json(users))
}

pub async fn set_user_online(
    session: web::Data<Session>,
    user_id: web::Json<UserId>,
) -> Result<impl Responder, AppError> {
    service::update_user_status(&session, &user_id.id, true).await?;
    Ok(HttpResponse::Ok().json(json!({ "status": "online" })))
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