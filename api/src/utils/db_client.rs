use actix_web::{body::None, http::{KeepAlive, StatusCode}, web};
use scylla::client::session::Session;
use scylla::statement::unprepared::Statement;
use scylla::serialize::row::SerializeRow;
use serde::{Serialize, de::DeserializeOwned};
use std::marker::PhantomData;
use crate::error::AppError;
use futures_util::stream::TryStreamExt;






// Further implement this service because I think there will some bugs related to this
pub struct DbClient<'a, T> {
    pub session: &'a web::Data<Session>,
    pub _phantom: PhantomData<T>,
}

impl<'a, T> DbClient<'a, T>
where
    T: Serialize + DeserializeOwned + Send + Sync + 'static,
{
    pub async fn insert<V>(&self, query: &str, values: V) -> Result<(), AppError>
    where
        V: SerializeRow + Send,
    {
        self.session
            .query_unpaged(query, values)
            .await
            .map_err(|e| AppError(format!("Failed to insert: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;
        Ok(())
    }

    pub async fn query<J, K>(&self, query: &str, values: Option<K>) -> Result<Vec<J>, AppError>
        where
            for<'frame, 'metadata> J: scylla::deserialize::row::DeserializeRow<'frame, 'metadata> + 'static,
            K: scylla::serialize::row::SerializeRow + Send,
        {
            let stm = Statement::new(query);
            let result = match values {
                Some(v) => self.session.query_iter(stm, v).await,
                None => self.session.query_iter(stm, ()).await,
            }
            .map_err(|e| AppError(format!("Failed to execute query: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;

            let mut stream = result
                .rows_stream::<J>()
                .map_err(|e| AppError(format!("Failed to get rows stream: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;

            let mut items = Vec::new();
            while let Some(row) = stream
                .try_next()
                .await
                .map_err(|e| AppError(format!("Failed to process results: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?
            {
                items.push(row);
            }
            Ok(items)
        }

}
