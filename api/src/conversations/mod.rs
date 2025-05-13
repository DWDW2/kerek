pub mod handler;
pub mod service;

use actix_web::web;
use crate::middleware::auth::Auth;

pub fn config(cfg: &mut web::ServiceConfig, jwt_secret: String) {
    cfg.service(
        web::scope("/api/conversations")
            .wrap(Auth {
                secret: jwt_secret,
            })
            .route("", web::get().to(handler::list_conversations))
            .route("", web::post().to(handler::create_conversation))
            .route("/{id}", web::get().to(handler::get_conversation))
            .route("/{id}", web::put().to(handler::update_conversation))
            .route("/{id}/messages", web::get().to(handler::list_messages))
            .route("/{id}/messages", web::post().to(handler::send_message))
    );
} 