use futures_util::TryStreamExt;
use scylla::client::session::Session;
use serde::{Deserialize, Serialize};
use crate::{
    error::AppError,
    models::group::{Group, GroupCustomization, NewGroup, GroupMessage, NewGroupMessage},
    utils::db_client::DbClient,
};
use chrono::Utc;
use uuid::{NoContext, Timestamp, Uuid};
use scylla::value::CqlTimestamp;
use actix_web::http::StatusCode;
use actix_web::web;
use std::time::{SystemTime, UNIX_EPOCH};
use scylla::value::CqlTimeuuid;
use std::marker::PhantomData;

pub struct GroupService {
    session: web::Data<Session>,
}

impl GroupService {
    pub async fn new(session: web::Data<Session>) -> Result<Self, AppError> {
        Ok(Self { session })
    }

    pub async fn create_group(
        &self,
        new_group: NewGroup,
        creator_id: String,
    ) -> Result<Group, AppError> {
        let now = Utc::now().timestamp();
        let group_id = Uuid::new_v4();
        let creator_uuid = Uuid::parse_str(&creator_id)
            .map_err(|e| AppError(format!("Invalid creator ID: {}", e), StatusCode::BAD_REQUEST))?;

        let db_client = DbClient::<Group> { 
            session: &self.session, 
            _phantom: PhantomData 
        };

        db_client.insert(
            "INSERT INTO groups (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)",
            (
                group_id,
                &new_group.name,
                CqlTimestamp(now * 1000),
                CqlTimestamp(now * 1000),
            )
        ).await?;

        db_client.insert(
            "INSERT INTO group_members (group_id, user_id, joined_at) VALUES (?, ?, ?)",
            (group_id, creator_uuid, CqlTimestamp(now * 1000))
        ).await?;
            
        for member_id in &new_group.member_ids {
            if member_id != &creator_id {
                let member_uuid = Uuid::parse_str(member_id)
                    .map_err(|e| AppError(format!("Invalid member ID: {}", e), StatusCode::BAD_REQUEST))?;
                
                db_client.insert(
                    "INSERT INTO group_members (group_id, user_id, joined_at) VALUES (?, ?, ?)",
                    (group_id, member_uuid, CqlTimestamp(now * 1000))
                ).await?;
            }
        }

        let members = self.get_group_members(&group_id.to_string()).await?;

        Ok(Group {
            id: group_id.to_string(),
            name: new_group.name,
            created_at: now,
            updated_at: now,
            member_ids: members.into_iter().map(|m| m.to_string()).collect(),
            customization: None,
        })
    }

    pub async fn get_group(&self, id: &str) -> Result<Group, AppError> {
        let group_id = Uuid::parse_str(id)
            .map_err(|e| AppError(format!("Invalid group ID: {}", e), StatusCode::BAD_REQUEST))?;

        let db_client = DbClient::<Group> { 
            session: &self.session, 
            _phantom: PhantomData 
        };

        let results = db_client.query::<(Uuid, String, CqlTimestamp, CqlTimestamp), _>(
            "SELECT id, name, created_at, updated_at FROM groups WHERE id = ? ALLOW FILTERING",
            Some((group_id,))
        ).await?;

        if let Some((id, name, created_at, updated_at)) = results.first() {
            let members = self.get_group_members(&id.to_string()).await?;
            
            let customization_results = db_client.query::<(Option<String>, Option<String>, Option<String>, Option<String>, Option<String>, Option<String>), _>(
                "SELECT background_image_url, primary_message_color, secondary_message_color, text_color_primary, text_color_secondary, photo_url FROM group_customization WHERE group_id = ? LIMIT 1 ALLOW FILTERING",
                Some((id,))
            ).await?;

            let customization = customization_results.first().map(|(background_image_url, primary_message_color, secondary_message_color, text_color_primary, text_color_secondary, photo_url)| {
                GroupCustomization {
                    background_image_url: background_image_url.clone(),
                    primary_message_color: primary_message_color.clone(),
                    secondary_message_color: secondary_message_color.clone(),
                    text_color_primary: text_color_primary.clone(),
                    text_color_secondary: text_color_secondary.clone(),
                    photo_url: photo_url.clone(),
                }
            });

            Ok(Group {
                id: id.to_string(),
                name: name.clone(),
                created_at: created_at.0 / 1000,
                updated_at: updated_at.0 / 1000,
                member_ids: members.into_iter().map(|m| m.to_string()).collect(),
                customization,
            })
        } else {
            Err(AppError("Group not found".into(), StatusCode::NOT_FOUND))
        }
    }

    async fn get_group_members(&self, group_id: &str) -> Result<Vec<Uuid>, AppError> {
        let group_uuid = Uuid::parse_str(group_id)
            .map_err(|e| AppError(format!("Invalid group ID: {}", e), StatusCode::BAD_REQUEST))?;
        
        let db_client = DbClient::<String> { 
            session: &self.session, 
            _phantom: PhantomData 
        };

        let results = db_client.query::<(Uuid, CqlTimestamp), _>(
            "SELECT user_id, joined_at FROM group_members WHERE group_id = ? ALLOW FILTERING",
            Some((group_uuid,))
        ).await?;

        let members = results.into_iter()
            .map(|(user_id, _)| user_id)
            .collect();

        Ok(members)
    }

    pub async fn list_user_groups(&self, user_id: &str) -> Result<Vec<Group>, AppError> {
        let user_uuid = Uuid::parse_str(user_id)
            .map_err(|e| AppError(format!("Invalid user ID: {}", e), StatusCode::BAD_REQUEST))?;

        let db_client = DbClient::<Group> { 
            session: &self.session, 
            _phantom: PhantomData 
        };

        let group_results = db_client.query::<(Uuid, CqlTimestamp), _>(
            "SELECT group_id, joined_at FROM group_members WHERE user_id = ? ALLOW FILTERING",
            Some((user_uuid,))
        ).await?;

        let mut groups = Vec::new();
        for (group_id, _) in group_results {
            if let Ok(group) = self.get_group(&group_id.to_string()).await {
                groups.push(group);
            }
        }

        Ok(groups)
    }

    pub async fn update_group(&self, id: &str, name: Option<String>) -> Result<Group, AppError> {
        let group_id = Uuid::parse_str(id)
            .map_err(|e| AppError(format!("Invalid group ID: {}", e), StatusCode::BAD_REQUEST))?;

        if let Some(name) = name {
            let now = Utc::now().timestamp();
            let db_client = DbClient::<Group> { 
                session: &self.session, 
                _phantom: PhantomData 
            };

            db_client.insert(
                "UPDATE groups SET name = ?, updated_at = ? WHERE id = ?",
                (&name, CqlTimestamp(now * 1000), group_id)
            ).await?;
        }

        self.get_group(id).await
    }

    pub async fn add_member(&self, group_id: &str, user_id: &str) -> Result<Group, AppError> {
        let group_uuid = Uuid::parse_str(group_id)
            .map_err(|e| AppError(format!("Invalid group ID: {}", e), StatusCode::BAD_REQUEST))?;
        let user_uuid = Uuid::parse_str(user_id)
            .map_err(|e| AppError(format!("Invalid user ID: {}", e), StatusCode::BAD_REQUEST))?;

        let now = Utc::now().timestamp();
        let db_client = DbClient::<Group> { 
            session: &self.session, 
            _phantom: PhantomData 
        };

        let existing_members = self.get_group_members(group_id).await?;
        if existing_members.contains(&user_uuid) {
            return Err(AppError("User is already a member of this group".to_string(), StatusCode::BAD_REQUEST));
        }

        db_client.insert(
            "INSERT INTO group_members (group_id, user_id, joined_at) VALUES (?, ?, ?)",
            (group_uuid, user_uuid, CqlTimestamp(now * 1000))
        ).await?;

        self.get_group(group_id).await
    }

    pub async fn remove_member(&self, group_id: &str, user_id: &str) -> Result<Group, AppError> {
        let group_uuid = Uuid::parse_str(group_id)
            .map_err(|e| AppError(format!("Invalid group ID: {}", e), StatusCode::BAD_REQUEST))?;
        let user_uuid = Uuid::parse_str(user_id)
            .map_err(|e| AppError(format!("Invalid user ID: {}", e), StatusCode::BAD_REQUEST))?;

        let db_client = DbClient::<Group> { 
            session: &self.session, 
            _phantom: PhantomData 
        };

        db_client.insert(
            "DELETE FROM group_members WHERE group_id = ? AND user_id = ?",
            (group_uuid, user_uuid)
        ).await?;

        self.get_group(group_id).await
    }

    pub async fn send_message(
        &self,
        group_id: &str,
        sender_id: &str,
        new_message: NewGroupMessage,
    ) -> Result<GroupMessage, AppError> {
        let group_uuid = Uuid::parse_str(group_id)
            .map_err(|e| AppError(format!("Invalid group ID: {}", e), StatusCode::BAD_REQUEST))?;
        let sender_uuid = Uuid::parse_str(sender_id)
            .map_err(|e| AppError(format!("Invalid sender ID: {}", e), StatusCode::BAD_REQUEST))?;

        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap();
        let ts = Timestamp::from_unix(&NoContext, now.as_secs(), now.subsec_nanos());
        let message_id = Uuid::new_v1(ts, &[1, 2, 3, 4, 5, 6]);

        let now_ts = CqlTimestamp(now.as_secs() as i64 * 1000); 

        let db_client = DbClient::<GroupMessage> { 
            session: &self.session, 
            _phantom: PhantomData 
        };
        
        db_client.insert(
            "INSERT INTO group_messages (group_id, message_id, sender_id, content, sent_at, edited_at) 
             VALUES (?, ?, ?, ?, ?, ?)",
            (
                group_uuid,
                CqlTimeuuid::from_bytes(*message_id.as_bytes()),
                sender_uuid,
                new_message.content.clone(),
                now_ts,
                now_ts,
            )
        ).await?;

        Ok(GroupMessage {
            id: message_id.to_string(),
            group_id: group_id.to_string(),
            sender_id: sender_id.to_string(),
            content: new_message.content,
            created_at: now.as_secs() as i64,
            updated_at: now.as_secs() as i64,
            is_edited: false,
            is_deleted: false,
        })
    }

    pub async fn list_messages(
        &self,
        group_id: &str,
        limit: i32,
    ) -> Result<Vec<GroupMessage>, AppError> {
        let group_uuid = Uuid::parse_str(group_id)
            .map_err(|e| AppError(format!("Invalid group ID: {}", e), StatusCode::BAD_REQUEST))?;

        let db_client = DbClient::<GroupMessage> { 
            session: &self.session, 
            _phantom: PhantomData 
        };

        let results = db_client.query::<(Uuid, CqlTimeuuid, Uuid, String, CqlTimestamp, CqlTimestamp), _>(
            "SELECT group_id, message_id, sender_id, content, sent_at, edited_at FROM group_messages WHERE group_id = ? ORDER BY message_id DESC LIMIT ? ALLOW FILTERING",
            Some((group_uuid, limit))
        ).await?;

        let messages = results.into_iter()
            .map(|(group_id, message_id, sender_id, content, sent_at, edited_at)| {
                GroupMessage {
                    id: Uuid::from_bytes(*message_id.as_bytes()).to_string(),
                    group_id: group_id.to_string(),
                    sender_id: sender_id.to_string(),
                    content,
                    created_at: sent_at.0 / 1000,
                    updated_at: edited_at.0 / 1000,
                    is_edited: sent_at.0 != edited_at.0,
                    is_deleted: false,
                }
            })
            .collect();

        Ok(messages)
    }

    pub async fn update_group_customization(
        &self,
        group_id: &str,
        user_id: &str,
        customization: GroupCustomization,
    ) -> Result<GroupCustomization, AppError> {
        let group_uuid = Uuid::parse_str(group_id)
            .map_err(|e| AppError(format!("Invalid group ID: {}", e), StatusCode::BAD_REQUEST))?;
        let user_uuid = Uuid::parse_str(user_id)
            .map_err(|e| AppError(format!("Invalid user ID: {}", e), StatusCode::BAD_REQUEST))?;

        let db_client = DbClient::<GroupCustomization> { 
            session: &self.session, 
            _phantom: PhantomData 
        };

        db_client.insert(
            "INSERT INTO group_customization (group_id, user_id, background_image_url, primary_message_color, secondary_message_color, text_color_primary, text_color_secondary, photo_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (
                group_uuid,
                user_uuid,
                customization.background_image_url.as_deref(),
                customization.primary_message_color.as_deref(),
                customization.secondary_message_color.as_deref(),
                customization.text_color_primary.as_deref(),
                customization.text_color_secondary.as_deref(),
                customization.photo_url.as_deref(),
            )
        ).await?;

        Ok(customization)
    }

    pub async fn delete_group(&self, group_id: &str) -> Result<(), AppError> {
        let group_uuid = Uuid::parse_str(group_id)
            .map_err(|e| AppError(format!("Invalid group ID: {}", e), StatusCode::BAD_REQUEST))?;

        let db_client = DbClient::<Group> { 
            session: &self.session, 
            _phantom: PhantomData 
        };

        db_client.insert(
            "DELETE FROM group_members WHERE group_id = ?",
            (group_uuid,)
        ).await?;

        db_client.insert(
            "DELETE FROM group_messages WHERE group_id = ?",
            (group_uuid,)
        ).await?;

        db_client.insert(
            "DELETE FROM group_customization WHERE group_id = ?",
            (group_uuid,)
        ).await?;   

        db_client.insert(
            "DELETE FROM groups WHERE id = ?",
            (group_uuid,)
        ).await?;

        Ok(())
    }
}
