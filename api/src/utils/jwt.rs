use chrono::{Utc, Duration};
use jsonwebtoken::{encode, Header, EncodingKey};

pub struct Claims {
    pub exp: usize,
    pub iat: usize,
    pub email: String,
    pub id: String,
}


pub fn generate_token(email: String, id: String) -> Result<String, ()> {
    let claims = Claims {
        exp: (Utc::now() + Duration::hours(1)).timestamp() as usize,
        iat: Utc::now().timestamp() as usize,
        email,
        id,
    };
    let token = encode(&Header::default(), &claims, &EncodingKey::from_secret(secret.as_ref())).unwrap();
    token
}

pub fn generate_refresh_token(email: String, id: String) -> Result<String, ()> {
    let claims = Claims {
        exp: (Utc::now() + Duration::days(30)).timestamp() as usize,
        iat: Utc::now().timestamp() as usize,
        email,
        id,
    };
    let token = encode(&Header::default(), &claims, &EncodingKey::from_secret(secret.as_ref())).unwrap();
    token
}

pub fn verify_token(token: String) -> Result<Claims, ()> {
    let claims = decode::<Claims>(&token, &DecodingKey::from_secret(secret.as_ref()), &Validation::default()).unwrap();
    claims
}

 