use actix_web::{web, HttpResponse, HttpRequest};
use scylla::client::session::Session;
use crate::{
    models::post::{NewPost, UpdatePost},
    posts::service::PostsService
};
use crate::error::AppError;
use serde::{Serialize, Deserialize};
use actix_web::http::StatusCode;
use crate::utils::jwt::get_user_id_from_token;

#[derive(Deserialize)]
pub struct PostQueryParams {
    limit: Option<i32>,
}

pub async fn get_all_posts(
    db_session: web::Data<Session>,
    query: web::Query<PostQueryParams>,
) -> Result<HttpResponse, AppError> {
    let service = PostsService::new(db_session.clone());
    let posts = service.get_all_posts(query.limit).await?;
    
    Ok(HttpResponse::Ok().json(posts))
}

pub async fn get_post_by_id(
    db_session: web::Data<Session>,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let post_id = path.into_inner();
    let service = PostsService::new(db_session.clone());
    let post = service.get_post_by_id(&post_id).await?;
    
    Ok(HttpResponse::Ok().json(post))
}

pub async fn get_posts_by_user(
    db_session: web::Data<Session>,
    path: web::Path<String>,
    query: web::Query<PostQueryParams>,
) -> Result<HttpResponse, AppError> {
    let user_id = path.into_inner();
    let service = PostsService::new(db_session.clone());
    let posts = service.get_posts_by_user(&user_id, query.limit).await?;
    
    Ok(HttpResponse::Ok().json(posts))
}

pub async fn get_my_posts(
    db_session: web::Data<Session>,
    request: HttpRequest,
    query: web::Query<PostQueryParams>,
) -> Result<HttpResponse, AppError> {
    let user_id = get_user_id_from_token(&request)?;
    let service = PostsService::new(db_session.clone());
    let posts = service.get_posts_by_user(&user_id, query.limit).await?;
    
    Ok(HttpResponse::Ok().json(posts))
}

pub async fn create_post(
    db_session: web::Data<Session>,
    request: HttpRequest,
    new_post: web::Json<NewPost>,
) -> Result<HttpResponse, AppError> {
    let user_id = get_user_id_from_token(&request)?;
    let service = PostsService::new(db_session.clone());
    let post = service.create_post(&user_id, new_post.into_inner()).await?;
    
    Ok(HttpResponse::Created().json(post))
}

pub async fn update_post(
    db_session: web::Data<Session>,
    request: HttpRequest,
    path: web::Path<String>,
    update_post: web::Json<UpdatePost>,
) -> Result<HttpResponse, AppError> {
    let user_id = get_user_id_from_token(&request)?;
    let post_id = path.into_inner();
    let service = PostsService::new(db_session.clone());
    let post = service.update_post(&post_id, &user_id, update_post.into_inner()).await?;
    
    Ok(HttpResponse::Ok().json(post))
}

pub async fn delete_post(
    db_session: web::Data<Session>,
    request: HttpRequest,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let user_id = get_user_id_from_token(&request)?;
    let post_id = path.into_inner();
    let service = PostsService::new(db_session.clone());
    service.delete_post(&post_id, &user_id).await?;
    
    Ok(HttpResponse::NoContent().finish())
}

pub async fn toggle_like_post(
    db_session: web::Data<Session>,
    request: HttpRequest,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let user_id = get_user_id_from_token(&request)?;
    let post_id = path.into_inner();
    let service = PostsService::new(db_session.clone());
    let post = service.toggle_like_post(&post_id, &user_id).await?;
    
    Ok(HttpResponse::Ok().json(post))
}

