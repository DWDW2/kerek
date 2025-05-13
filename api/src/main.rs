mod db;
mod models;
mod handlers;
mod error;
mod middleware;

use actix_cors::Cors;
use actix_web::{web, App, HttpServer};
use dotenv::dotenv;
use env_logger::Env;
use middleware::auth::Auth;
use std::env;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();
    env_logger::init_from_env(Env::default().default_filter_or("info"));

    let session = db::connect().await.unwrap();
    let session_data = web::Data::new(session);

    db::setup_database(&session_data).await.unwrap();

    let host = env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port = env::var("PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse::<u16>()
        .expect("PORT must be a number");

    let jwt_secret = env::var("JWT_SECRET").expect("JWT_SECRET must be set");

    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .max_age(3600);

        App::new()
            .wrap(actix_web::middleware::Logger::default())
            .wrap(actix_web::middleware::Logger::new("%a %r %s %b %D"))
            .wrap(cors)
            .app_data(session_data.clone())
            .app_data(web::Data::new(jwt_secret.clone()))
            .service(
                web::scope("/api/users")
                    .route("/register", web::post().to(handlers::user::register))
                    .route("/login", web::post().to(handlers::user::login)),
            )
            .service(
                web::scope("/api")
                    .route("/profile/{id}", web::get().to(handlers::user::get_profile))
                    .route("/profile/{id}", web::put().to(handlers::user::update_profile))
                    .route("/search", web::get().to(handlers::user::search_users))
                    .wrap(Auth {
                        secret: jwt_secret.clone(),
                    })
            )
            .default_service(web::route().to(|| async {
                actix_web::HttpResponse::NotFound().body("Route not found")
            }))
    })
    .bind((host, port))?
    .run()
    .await
}
