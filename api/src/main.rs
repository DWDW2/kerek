mod db;
mod models;
mod error;
mod middleware;
mod users;
mod conversations;
mod groups;
mod utils;
mod posts;
mod compiler;
use actix_cors::Cors;
use actix_web::{web, App, HttpServer};
use dotenv::dotenv;
use env_logger::Env;
use middleware::auth::Auth;
use std::env;
use actix_web::middleware::Logger;
use crate::users::handler as user_handler;
use crate::conversations::handler as conversation_handler;
use crate::groups::handler as group_handler;
use crate::utils::websocket as websocket_handler;
use crate::utils::websocket::RoomStore;
use crate::utils::seed;
use crate::compiler::handler as compiler_handler;
use std::sync::Arc;
use tokio::sync::RwLock;
use std::collections::HashMap;


#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();
    env_logger::init_from_env(Env::default().default_filter_or("debug"));

    let session = db::connect().await.unwrap();
    let session_data = web::Data::new(session);
    
    let should_seed = env::args().any(|arg| arg == "--seed");
    db::setup_database(&session_data, should_seed).await.unwrap();

    if should_seed {
        println!("Seeding database...");
        seed::seed_database(&session_data).await.unwrap();
        println!("Database seeded successfully!");
    }

    let host = env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port = env::var("PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse::<u16>()
        .expect("PORT must be a number");

    let jwt_secret = env::var("JWT_SECRET").expect("JWT_SECRET must be set");
    let room_store: RoomStore = Arc::new(RwLock::new(HashMap::new()));
    HttpServer::new(move || {   
        let cors = Cors::default()  
            .allow_any_header()
            .allow_any_method()
            .allow_any_origin()
            .max_age(3600);

        App::new()
            .wrap(Logger::new("%a %r %s %b %{Referer}i %{User-Agent}i %T"))
            .wrap(cors)
            .app_data(session_data.clone())
            .app_data(web::Data::new(room_store.clone()))
            .app_data(web::Data::new(jwt_secret.clone()))
            .route("/ws/{id}", web::get().to(websocket_handler::echo))
            .route("/ws/groups/{id}", web::get().to(websocket_handler::group_echo))
            .route("/ws/online", web::get().to(websocket_handler::online))
            .service(
                web::scope("/api")
                    .service(
                        web::scope("/auth")
                            .route("/register", web::post().to(user_handler::register))
                            .route("/login", web::post().to(user_handler::login))
                    )
                    .service(
                        web::scope("")
                            .wrap(Auth {
                                secret: jwt_secret.clone(),
                            })
                            .service(
                                web::scope("/users")
                                    .route("/me", web::get().to(user_handler::get_me))
                                    .route("/profile/{id}", web::get().to(user_handler::get_profile))
                                    .route("/profile", web::put().to(user_handler::update_profile))
                                    .route("/profile/search/{id}", web::get().to(user_handler::search_users))
                                    .route("", web::get().to(user_handler::get_all_users))
                                    .route("/online", web::post().to(user_handler::set_user_online))
                            )
                            .service(
                                web::scope("/conversations")
                                    .route("", web::post().to(conversation_handler::create_conversation))
                                    .route("", web::get().to(conversation_handler::list_conversations))
                                    .route("/{id}", web::get().to(conversation_handler::get_conversation))
                                    .route("/{id}", web::put().to(conversation_handler::update_conversation))
                                    .route("/{id}/messages", web::post().to(conversation_handler::send_message))
                                    .route("/{id}/messages", web::get().to(conversation_handler::list_messages))
                                    .route("/{id}/customization", web::post().to(conversation_handler::update_conversation_customization))
                            )
                            .service(
                                web::scope("/groups")
                                    .route("", web::post().to(group_handler::create_group))
                                    .route("", web::get().to(group_handler::list_user_groups))
                                    .route("/{id}", web::get().to(group_handler::get_group))
                                    .route("/{id}/public", web::get().to(group_handler::get_group_public))
                                    .route("/{id}/join", web::post().to(group_handler::join_group))
                                    .route("/{id}", web::put().to(group_handler::update_group))
                                    .route("/{id}", web::delete().to(group_handler::delete_group))
                                    .route("/{id}/members", web::post().to(group_handler::add_member))
                                    .route("/{id}/members", web::delete().to(group_handler::remove_member))
                                    .route("/{id}/leave", web::post().to(group_handler::leave_group))
                                    .route("/{id}/messages", web::post().to(group_handler::send_message))
                                    .route("/{id}/messages", web::get().to(group_handler::list_messages))
                                    .route("/{id}/customization", web::post().to(group_handler::update_group_customization))
                            )
                            .service(
                                web::scope("/posts")
                                    .route("", web::get().to(posts::handler::get_all_posts))
                                    .route("", web::post().to(posts::handler::create_post))
                                    .route("/my", web::get().to(posts::handler::get_my_posts))
                                    .route("/user/{user_id}", web::get().to(posts::handler::get_posts_by_user))
                                    .route("/{id}", web::get().to(posts::handler::get_post_by_id))
                                    .route("/{id}", web::put().to(posts::handler::update_post))
                                    .route("/{id}", web::delete().to(posts::handler::delete_post))
                                    .route("/{id}/like", web::post().to(posts::handler::toggle_like_post))
                                )
                            .service(
                                web::scope("/compiler")
                                    .route("/compile", web::post().to(compiler_handler::compile_code))
                                    .route("/languages", web::get().to(compiler_handler::get_supported_languages))
                                )
                            .route("/run-code", web::post().to(compiler_handler::run_code_legacy))
                    )
            )
            .default_service(web::route().to(|| async {
                actix_web::HttpResponse::NotFound().body("Route not found")
            }))
    })
    .bind((host, port))?
    .run()
    .await
}
