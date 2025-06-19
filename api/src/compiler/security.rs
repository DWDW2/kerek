use crate::error::AppError;
use actix_web::http::StatusCode;
use std::collections::HashSet;

pub struct SecurityConfig {
    pub max_execution_time: u64,
    pub max_output_size: usize,
    pub max_code_size: usize,
    pub forbidden_patterns: HashSet<String>,
}

impl Default for SecurityConfig {
    fn default() -> Self {
        let mut forbidden_patterns = HashSet::new();
        
        forbidden_patterns.insert("system(".to_string());
        forbidden_patterns.insert("exec(".to_string());
        forbidden_patterns.insert("eval(".to_string());
        forbidden_patterns.insert("import os".to_string());
        forbidden_patterns.insert("import subprocess".to_string());
        forbidden_patterns.insert("__import__".to_string());
        forbidden_patterns.insert("open(".to_string());
        forbidden_patterns.insert("file(".to_string());
        forbidden_patterns.insert("#include <fstream>".to_string());
        forbidden_patterns.insert("#include <cstdlib>".to_string());
        forbidden_patterns.insert("Runtime.getRuntime()".to_string());
        forbidden_patterns.insert("ProcessBuilder".to_string());
        forbidden_patterns.insert("System.exit".to_string());
        
        Self {
            max_execution_time: 10, 
            max_output_size: 1024 * 1024, 
            max_code_size: 10 * 1024,
            forbidden_patterns,
        }
    }
}

impl SecurityConfig {
    pub fn validate_code(&self, code: &str) -> Result<(), AppError> {
        if code.len() > self.max_code_size {
            return Err(AppError(
                format!("Code size exceeds limit of {} bytes", self.max_code_size),
                StatusCode::BAD_REQUEST,
            ));
        }

        let code_lower = code.to_lowercase();
        for pattern in &self.forbidden_patterns {
            if code_lower.contains(&pattern.to_lowercase()) {
                return Err(AppError(
                    format!("Code contains forbidden pattern: {}", pattern),
                    StatusCode::BAD_REQUEST,
                ));
            }
        }

        Ok(())
    }

    pub fn validate_output_size(&self, output: &str) -> Result<(), AppError> {
        if output.len() > self.max_output_size {
            return Err(AppError(
                "Output size exceeds limit".to_string(),
                StatusCode::REQUEST_HEADER_FIELDS_TOO_LARGE,
            ));
        }
        Ok(())
    }

    pub fn get_execution_timeout(&self) -> u64 {
        self.max_execution_time
    }

    pub fn sanitize_environment() -> Vec<(String, String)> {
        vec![
            ("PATH".to_string(), "/usr/local/bin:/usr/bin:/bin".to_string()),
            ("HOME".to_string(), "/tmp".to_string()),
            ("USER".to_string(), "compiler".to_string()),
        ]
    }
} 
