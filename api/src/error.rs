use actix_web::{ResponseError, HttpResponse, http::StatusCode};
use serde_json::json;
use std::fmt::{Display, Formatter};

#[derive(Debug)]
pub struct AppError (
    pub String,
    pub StatusCode,
);

impl Display for AppError {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl ResponseError for AppError {
    fn error_response(&self) -> HttpResponse {
        HttpResponse::build(self.1).json(json!({
            "error": self.0,
        }))
    }
}