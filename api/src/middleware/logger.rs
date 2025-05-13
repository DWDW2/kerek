use actix_web::{
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    Error,
};
use futures_util::future::LocalBoxFuture;
use std::future::{ready, Ready};
use std::time::Instant;


pub struct Logger;

impl<S, B> Transform<S, ServiceRequest> for Logger
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = LoggerMiddleware<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(LoggerMiddleware { service }))
    }
}

pub struct LoggerMiddleware<S> {
    service: S,
}

impl<S, B> Service<ServiceRequest> for LoggerMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let start = Instant::now();
        let method = req.method().clone();
        let uri = req.uri().clone();
        let version = req.version();
        let user_agent = req
            .headers()
            .clone()
            .get("user-agent")
            .and_then(|h| h.to_str().ok())
            .unwrap_or("unknown").to_string();

        let fut = self.service.call(req);

        Box::pin(async move {
            let result = fut.await;
            let elapsed = start.elapsed();  
            match &result {
                Ok(res) => {
                    println!(
                        "{} {} {:?} {} {} {}ms",
                        method,
                        uri,
                        version,
                        res.status(),
                        user_agent,
                        elapsed.as_millis()
                    );
                }
                Err(e) => {
                    println!(
                        "{} {} {:?} ERROR {} {}ms - {}",
                        method,
                        uri,
                        version,
                        user_agent,
                        elapsed.as_millis(),
                        e
                    );
                }
            }

            result
        })
    }
}