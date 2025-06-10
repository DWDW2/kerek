use actix_web::{web, HttpResponse, HttpRequest};
use scylla::client::session::Session;
use crate::models::group::{
    NewGroup, GroupCustomization, NewGroupMessage, 
    AddMemberRequest, RemoveMemberRequest, UpdateGroupRequest
};
use crate::error::AppError;
use crate::groups::service::GroupService;
use serde::{Serialize, Deserialize};
use serde_json;
use actix_web::http::StatusCode;
use crate::utils::jwt::get_user_id_from_token;

#[derive(Debug, Serialize, Deserialize)]
pub struct ListMessagesQuery {
    pub limit: Option<i32>,
}


pub async fn create_group(
    session: web::Data<Session>,
    req: HttpRequest,
    new_group: web::Json<NewGroup>,
) -> Result<HttpResponse, AppError> {
    let user_id = get_user_id_from_token(&req)?;
    let service = GroupService::new(session).await?;
    let group = service
        .create_group(new_group.into_inner(), user_id)
        .await?;
    Ok(HttpResponse::Created().json(group))
}


pub async fn get_group(
    session: web::Data<Session>,
    req: HttpRequest,
    group_id: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let user_id = get_user_id_from_token(&req)?;
    let service = GroupService::new(session).await?;
    let group = service.get_group(&group_id).await?;
    
    if !group.member_ids.contains(&user_id) {
        return Err(AppError("Not authorized to view this group".to_string(), StatusCode::FORBIDDEN));
    }
    
    Ok(HttpResponse::Ok().json(group))
}

pub async fn list_user_groups(
    session: web::Data<Session>,
    req: HttpRequest,
) -> Result<HttpResponse, AppError> {
    let user_id = get_user_id_from_token(&req)?;
    let service = GroupService::new(session).await?;
    let groups = service.list_user_groups(&user_id).await?;
    Ok(HttpResponse::Ok().json(groups))
}

pub async fn update_group(
    session: web::Data<Session>,
    req: HttpRequest,
    group_id: web::Path<String>,
    update_request: web::Json<UpdateGroupRequest>,
) -> Result<HttpResponse, AppError> {
    let user_id = get_user_id_from_token(&req)?;
    let service = GroupService::new(session).await?;
    
    let group = service.get_group(&group_id).await?;
    if !group.member_ids.contains(&user_id) {
        return Err(AppError("Not authorized to update this group".to_string(), StatusCode::FORBIDDEN));
    }

    let updated_group = service
        .update_group(&group_id, update_request.name.clone())
        .await?;
    Ok(HttpResponse::Ok().json(updated_group))
}

pub async fn add_member(
    session: web::Data<Session>,
    req: HttpRequest,
    group_id: web::Path<String>,
    add_request: web::Json<AddMemberRequest>,
) -> Result<HttpResponse, AppError> {
    let user_id = get_user_id_from_token(&req)?;
    let service = GroupService::new(session).await?;
    
    let group = service.get_group(&group_id).await?;
    if !group.member_ids.contains(&user_id) {
        return Err(AppError("Not authorized to add members to this group".to_string(), StatusCode::FORBIDDEN));
    }

    let updated_group = service
        .add_member(&group_id, &add_request.user_id)
        .await?;
    Ok(HttpResponse::Ok().json(updated_group))
}

pub async fn remove_member(
    session: web::Data<Session>,
    req: HttpRequest,
    group_id: web::Path<String>,
    remove_request: web::Json<RemoveMemberRequest>,
) -> Result<HttpResponse, AppError> {
    let user_id = get_user_id_from_token(&req)?;
    let service = GroupService::new(session).await?;
    
    let group = service.get_group(&group_id).await?;
    if !group.member_ids.contains(&user_id) {
        return Err(AppError("Not authorized to remove members from this group".to_string(), StatusCode::FORBIDDEN));
    }

    let updated_group = service
        .remove_member(&group_id, &remove_request.user_id)
        .await?;
    Ok(HttpResponse::Ok().json(updated_group))
}

pub async fn send_message(
    session: web::Data<Session>,
    req: HttpRequest,
    group_id: web::Path<String>,
    new_message: web::Json<NewGroupMessage>,
) -> Result<HttpResponse, AppError> {
    let user_id = get_user_id_from_token(&req)?;
    let service = GroupService::new(session).await?;
    
    let group = service.get_group(&group_id).await?;
    if !group.member_ids.contains(&user_id) {
        return Err(AppError("Not authorized to send messages in this group".to_string(), StatusCode::FORBIDDEN));
    }

    let message = service
        .send_message(&group_id, &user_id, new_message.into_inner())
        .await?;
    Ok(HttpResponse::Created().json(message))
}

pub async fn list_messages(
    session: web::Data<Session>,
    req: HttpRequest,
    group_id: web::Path<String>,
    query: web::Query<ListMessagesQuery>,
) -> Result<HttpResponse, AppError> {
    let user_id = get_user_id_from_token(&req)?;
    let service = GroupService::new(session).await?;
    
    let group = service.get_group(&group_id).await?;
    if !group.member_ids.contains(&user_id) {
        return Err(AppError("Not authorized to view messages in this group".to_string(), StatusCode::FORBIDDEN));
    }

    let limit = query.limit.unwrap_or(50);
    let messages = service.list_messages(&group_id, limit).await?;
    Ok(HttpResponse::Ok().json(messages))
}

pub async fn update_group_customization(
    session: web::Data<Session>,
    req: HttpRequest,
    group_id: web::Path<String>,
    customization: web::Json<GroupCustomization>,
) -> Result<HttpResponse, AppError> {
    let user_id = get_user_id_from_token(&req)?;
    let service = GroupService::new(session).await?;
    
    let group = service.get_group(&group_id).await?;
    if !group.member_ids.contains(&user_id) {
        return Err(AppError("Not authorized to customize this group".to_string(), StatusCode::FORBIDDEN));
    }

    let updated_customization = service
        .update_group_customization(&group_id, &user_id, customization.into_inner())
        .await?;
    Ok(HttpResponse::Ok().json(updated_customization))
}

pub async fn delete_group(
    session: web::Data<Session>,
    req: HttpRequest,
    group_id: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let user_id = get_user_id_from_token(&req)?;
    let service = GroupService::new(session).await?;
    
    let group = service.get_group(&group_id).await?;
    if !group.member_ids.contains(&user_id) {
        return Err(AppError("Not authorized to delete this group".to_string(), StatusCode::FORBIDDEN));
    }

    service.delete_group(&group_id).await?;
    Ok(HttpResponse::NoContent().finish())
}

pub async fn join_group(
    session: web::Data<Session>,
    req: HttpRequest,
    group_id: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let user_id = get_user_id_from_token(&req)?;
    let service = GroupService::new(session).await?;
    
    let updated_group = service
        .add_member(&group_id, &user_id)
        .await?;
    Ok(HttpResponse::Ok().json(updated_group))
}

pub async fn get_group_public(
    session: web::Data<Session>,
    req: HttpRequest,
    group_id: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let _user_id = get_user_id_from_token(&req)?; // Verify token but don't check membership
    let service = GroupService::new(session).await?;
    let group = service.get_group(&group_id).await?;
    
    // Return limited public information
    let public_info = serde_json::json!({
        "id": group.id,
        "name": group.name,
        "member_ids": group.member_ids,
        "customization": group.customization
    });
    
    Ok(HttpResponse::Ok().json(public_info))
}

pub async fn leave_group(
    session: web::Data<Session>,
    req: HttpRequest,
    group_id: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let user_id = get_user_id_from_token(&req)?;
    let service = GroupService::new(session).await?;
                
    let group = service.get_group(&group_id).await?;
    if !group.member_ids.contains(&user_id) {
        return Err(AppError("You are not a member of this group".to_string(), StatusCode::BAD_REQUEST));
    }

    let updated_group = service
        .remove_member(&group_id, &user_id)
        .await?;
    Ok(HttpResponse::Ok().json(updated_group))
}
