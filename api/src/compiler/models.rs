use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Deserialize, Clone)]
pub struct CompileRequest {
    pub language: String,
    pub code: String,
    pub input: Option<String>,
    pub timeout: Option<u64>, // timeout in seconds
}

#[derive(Debug, Serialize)]
pub struct CompileResponse {
    pub success: bool,
    pub output: Option<String>,
    pub error: Option<String>,
    pub execution_time: u64, // in milliseconds
}

#[derive(Debug, Clone)]
pub struct LanguageConfig {
    pub file_extension: String,
    pub compile_command: Option<Vec<String>>,
    pub run_command: Vec<String>,
    pub supports_input: bool,
}

#[derive(Debug, Serialize)]
pub struct SupportedLanguage {
    pub name: String,
    pub key: String,
    pub file_extension: String,
    pub supports_compilation: bool,
    pub supports_input: bool,
}

impl LanguageConfig {
    pub fn get_supported_languages() -> HashMap<String, LanguageConfig> {
        let mut languages = HashMap::new();

        languages.insert(
            "cpp".to_string(),
            LanguageConfig {
                file_extension: ".cpp".to_string(),
                compile_command: Some(vec!["g++".to_string(), "-o".to_string()]),
                run_command: vec![],
                supports_input: true,
            },
        );

        languages.insert(
            "c".to_string(),
            LanguageConfig {
                file_extension: ".c".to_string(),
                compile_command: Some(vec!["gcc".to_string(), "-o".to_string()]),
                run_command: vec![],
                supports_input: true,
            },
        );

        languages.insert(
            "python".to_string(),
            LanguageConfig {
                file_extension: ".py".to_string(),
                compile_command: None,
                run_command: vec!["python3".to_string()],
                supports_input: true,
            },
        );

        languages.insert(
            "java".to_string(),
            LanguageConfig {
                file_extension: ".java".to_string(),
                compile_command: Some(vec!["javac".to_string()]),
                run_command: vec!["java".to_string()],
                supports_input: true,
            },
        );

        languages.insert(
            "javascript".to_string(),
            LanguageConfig {
                file_extension: ".js".to_string(),
                compile_command: None,
                run_command: vec!["node".to_string()],
                supports_input: true,
            },
        );

        languages
    }

    pub fn to_supported_language(key: &str, config: &LanguageConfig) -> SupportedLanguage {
        SupportedLanguage {
            name: match key {
                "cpp" => "C++".to_string(),
                "c" => "C".to_string(),
                "python" => "Python".to_string(),
                "java" => "Java".to_string(),
                "javascript" => "JavaScript".to_string(),
                _ => key.to_string(),
            },
            key: key.to_string(),
            file_extension: config.file_extension.clone(),
            supports_compilation: config.compile_command.is_some(),
            supports_input: config.supports_input,
        }
    }
} 
