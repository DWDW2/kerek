use actix_web::{web, HttpResponse, Responder};
use std::sync::Arc;
use tokio::sync::Mutex;

use crate::compiler::models::{CompileRequest, SupportedLanguage};
use crate::compiler::service::CompilerService;
use crate::error::AppError;

lazy_static::lazy_static! {
    static ref COMPILER_SERVICE: Arc<Mutex<Option<CompilerService>>> = Arc::new(Mutex::new(None));
}

async fn get_compiler_service() -> Result<CompilerService, AppError> {
    let mut service_guard = COMPILER_SERVICE.lock().await;
    
    if service_guard.is_none() {
        *service_guard = Some(CompilerService::new()?);
    }
    
    CompilerService::new()
}

pub async fn compile_code(
    request: web::Json<CompileRequest>,
) -> Result<impl Responder, AppError> {
    let compiler_service = get_compiler_service().await?;
    let result = compiler_service.compile_and_run(request.into_inner()).await?;
    
    Ok(HttpResponse::Ok().json(result))
}

pub async fn get_supported_languages() -> Result<impl Responder, AppError> {
    let compiler_service = get_compiler_service().await?;
    let languages = compiler_service.get_supported_languages();
    
    Ok(HttpResponse::Ok().json(languages))
}

pub async fn run_code_legacy(
    request: web::Json<serde_json::Value>,
) -> Result<impl Responder, AppError> {
    let legacy_request = request.into_inner();
    
    let language = legacy_request.get("language")
        .and_then(|v| v.as_str())
        .unwrap_or("python")
        .to_string();
    
    let code = legacy_request.get("code")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    
    let input = legacy_request.get("input")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    
    let compile_request = CompileRequest {
        language,
        code,
        input,
        timeout: Some(10),
    };
    
    let compiler_service = get_compiler_service().await?;
    let result = compiler_service.compile_and_run(compile_request).await?;
    
    let legacy_response = serde_json::json!({
        "success": result.success,
        "output": result.output.unwrap_or_default(),
        "error": result.error.unwrap_or_default(),
        "executionTime": result.execution_time
    });
    
    Ok(HttpResponse::Ok().json(legacy_response))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::compiler::models::CompileRequest;

    #[tokio::test]
    async fn test_python_hello_world() {
        let request = CompileRequest {
            language: "python".to_string(),
            code: "print('Hello, World!')".to_string(),
            input: None,
            timeout: Some(5),
        };

        let service = CompilerService::new().unwrap();
        let result = service.compile_and_run(request).await.unwrap();
        
        assert!(result.success);
        assert_eq!(result.output.as_ref().unwrap().trim(), "Hello, World!");
    }

    #[tokio::test]
    async fn test_cpp_hello_world() {
        let request = CompileRequest {
            language: "cpp".to_string(),
            code: r#"
                #include <iostream>
                int main() {
                    std::cout << "Hello, World!" << std::endl;
                    return 0;
                }
            "#.to_string(),
            input: None,
            timeout: Some(10),
        };

        let service = CompilerService::new().unwrap();
        let result = service.compile_and_run(request).await.unwrap();
        
        assert!(result.success);
        assert_eq!(result.output.as_ref().unwrap().trim(), "Hello, World!");
    }

    #[tokio::test]
    async fn test_java_hello_world() {
        let request = CompileRequest {
            language: "java".to_string(),
            code: r#"
                public class Main {
                    public static void main(String[] args) {
                        System.out.println("Hello, World!");
                    }
                }
            "#.to_string(),
            input: None,
            timeout: Some(15),
        };

        let service = CompilerService::new().unwrap();
        let result = service.compile_and_run(request).await.unwrap();
        
        assert!(result.success);
        assert_eq!(result.output.as_ref().unwrap().trim(), "Hello, World!");
    }

    #[tokio::test]
    async fn test_python_with_input() {
        let request = CompileRequest {
            language: "python".to_string(),
            code: r#"
name = input("Enter your name: ")
print(f"Hello, {name}!")
            "#.to_string(),
            input: Some("Alice".to_string()),
            timeout: Some(5),
        };

        let service = CompilerService::new().unwrap();
        let result = service.compile_and_run(request).await.unwrap();
        
        assert!(result.success);
        assert!(result.output.as_ref().unwrap().contains("Hello, Alice!"));
    }
} 
