use actix_web::HttpRequest;
use chrono::{Utc, Duration};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation, TokenData};
use serde::{Serialize, Deserialize};

use crate::error::AppError;

#[derive(Serialize, Deserialize)]
pub struct Claims {
    pub exp: usize, 
    pub sub: String,
}


pub fn generate_token(email: String, id: String) -> Result<String, ()> {
    let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "your-secret-key".to_string());
    let claims = Claims {
        exp: (Utc::now() + Duration::hours(1)).timestamp() as usize,
        sub: id,    
    };
    let token = encode(&Header::default(), &claims, &EncodingKey::from_secret(secret.as_ref())).unwrap();
    Ok(token)   
}

pub fn generate_refresh_token(email: String, id: String) -> Result<String, ()> {
    let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "your-secret-key".to_string());
    let claims = Claims {
        exp: (Utc::now() + Duration::days(30)).timestamp() as usize,
        sub: id,
    };
    let token = encode(&Header::default(), &claims, &EncodingKey::from_secret(secret.as_ref())).unwrap();
    Ok(token)
}

pub fn verify_token(token: String) -> Result<TokenData<Claims>, ()> {
    let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "your-secret-key".to_string());
    let claims = decode::<Claims>(&token, &DecodingKey::from_secret(secret.as_ref()), &Validation::default()).unwrap();
    Ok(claims)
}

 pub fn get_user_id_from_header(req: HttpRequest) -> Result<String, ()> {
    let auth_header = req.headers()
        .get("Authorization")
        .ok_or_else(|| AppError("Missing Authorization header".to_string(), actix_web::http::StatusCode::UNAUTHORIZED)).unwrap()
        .to_str()
        .map_err(|_| AppError("Invalid Authorization header".to_string(), actix_web::http::StatusCode::UNAUTHORIZED)).unwrap();

    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or_else(|| AppError("Invalid token format".to_string(), actix_web::http::StatusCode::UNAUTHORIZED)).unwrap();

    let claims = verify_token(token.to_string())
        .map_err(|_| AppError("Invalid token".to_string(), actix_web::http::StatusCode::UNAUTHORIZED)).unwrap();

    Ok(claims.claims.sub)

 }