mod db;
mod models;
mod handlers;
mod error;
mod middleware;
// mod websocket;
// mod error;
use actix_web::middleware as actix_middleware;
use actix_web::{web, App, HttpServer};
use actix_cors::Cors;
use dotenv::dotenv;
use std::env;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();
    env_logger::init();
    
    let session = db::connect().await.unwrap();
    let session_data = web::Data::new(session);
    
    db::setup_database(&session_data).await.unwrap();
    
    let host = env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port = env::var("PORT").unwrap_or_else(|_| "8080".to_string())
        .parse::<u16>().expect("PORT must be a number");
    
    println!("Starting server at http://{}:{}", host, port);
    
    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .max_age(3600);
            
        App::new()
            .wrap(cors)
            .wrap(actix_middleware::Logger::default())
            .app_data(session_data.clone())
            // User routes
            .service(
                web::scope("/api/users")
                    .route("/register", web::post().to(handlers::user::register))
                    .route("/login", web::post().to(handlers::user::login))
                    .route("/profile", web::get().to(handlers::user::get_profile))
                    .route("/profile", web::put().to(handlers::user::update_profile))
                    .route("/search", web::get().to(handlers::user::search))
            )
            // // Conversation routes
            // .service(
            //     web::scope("/api/conversations")
            //         .route("", web::post().to(handlers::conversations::create))
            //         .route("", web::get().to(handlers::conversations::list))
            //         .route("/{id}", web::get().to(handlers::conversations::get))
            //         .route("/{id}", web::put().to(handlers::conversations::update))
            //         .route("/{id}/messages", web::post().to(handlers::messages::send))
            //         .route("/{id}/messages", web::get().to(handlers::messages::list))
            // )
            // // Message routes
            // .service(
            //     web::scope("/api/messages")
            //         .route("/{id}", web::put().to(handlers::messages::update))
            //         .route("/{id}", web::delete().to(handlers::messages::delete))
            // )
            // // WebSocket route
            // .route("/ws/messages", web::get().to(websocket::ws_index))
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
