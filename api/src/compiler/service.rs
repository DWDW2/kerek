use std::collections::HashMap;
use std::path::PathBuf;
use std::time::{Duration, Instant};
use tokio::fs;
use tokio::io::AsyncWriteExt;
use tokio::process::Command;
use tokio::time::timeout;
use uuid::Uuid;
use std::process::Stdio;
use crate::compiler::models::{CompileRequest, CompileResponse, LanguageConfig};
use crate::compiler::security::SecurityConfig;
use crate::error::AppError;
use actix_web::http::StatusCode;

pub struct CompilerService {
    languages: HashMap<String, LanguageConfig>,
    temp_dir: PathBuf,
    security_config: SecurityConfig,
}

impl CompilerService {
    pub fn new() -> Result<Self, AppError> {
        let languages = LanguageConfig::get_supported_languages();
        
        let temp_dir = std::env::temp_dir().join("kerek_compiler");
        std::fs::create_dir_all(&temp_dir)
            .map_err(|e| AppError(format!("Failed to create temp directory: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;

        Ok(Self {
            languages,
            temp_dir,
            security_config: SecurityConfig::default(),
        })
    }

    pub async fn compile_and_run(&self, request: CompileRequest) -> Result<CompileResponse, AppError> {
        let start_time = Instant::now();
        
        self.security_config.validate_code(&request.code)?;
        
        let language_config = self.languages.get(&request.language)
            .ok_or_else(|| AppError(format!("Language '{}' is not supported", request.language), StatusCode::BAD_REQUEST))?;

        let workspace_id = Uuid::new_v4().to_string();
        let workspace_dir = self.temp_dir.join(&workspace_id);
        
        fs::create_dir_all(&workspace_dir).await
            .map_err(|e| AppError(format!("Failed to create workspace: {}", e), StatusCode::INTERNAL_SERVER_ERROR))?;

        let result = self.execute_code(&request, language_config, &workspace_dir).await;
        
        let _ = fs::remove_dir_all(&workspace_dir).await;

        let execution_time = start_time.elapsed().as_millis() as u64;
        
        match result {
            Ok(output) => Ok(CompileResponse {
                success: true,
                output: Some(output),
                error: None,
                execution_time,
            }),
            Err(error) => Ok(CompileResponse {
                success: false,
                output: None,
                error: Some(error),
                execution_time,
            }),
        }
    }

    async fn execute_code(
        &self,
        request: &CompileRequest,
        config: &LanguageConfig,
        workspace_dir: &PathBuf,
    ) -> Result<String, String> {
        let timeout_duration = Duration::from_secs(
            request.timeout
                .unwrap_or(self.security_config.get_execution_timeout())
                .min(self.security_config.get_execution_timeout())
        );

        match request.language.as_str() {
            "cpp" | "c" => self.execute_compiled_language(request, config, workspace_dir, timeout_duration).await,
            "java" => self.execute_java(request, workspace_dir, timeout_duration).await,
            "python" | "javascript" => self.execute_interpreted_language(request, config, workspace_dir, timeout_duration).await,
            _ => Err(format!("Language '{}' execution not implemented", request.language)),
        }
    }

    async fn execute_compiled_language(
        &self,
        request: &CompileRequest,
        config: &LanguageConfig,
        workspace_dir: &PathBuf,
        timeout_duration: Duration,
    ) -> Result<String, String> {
        let source_file = workspace_dir.join(format!("main{}", config.file_extension));
        let executable_file = workspace_dir.join("main");

        
        fs::write(&source_file, &request.code).await
            .map_err(|e| format!("Failed to write source file: {}", e))?;

        
        if let Some(compile_cmd) = &config.compile_command {
            let mut cmd = Command::new(&compile_cmd[0]);
            cmd.args(&compile_cmd[1..])
                .arg(&executable_file)
                .arg(&source_file)
                .current_dir(workspace_dir);

            let compile_result = timeout(timeout_duration, cmd.output()).await
                .map_err(|_| "Compilation timeout".to_string())?
                .map_err(|e| format!("Compilation failed: {}", e))?;

            if !compile_result.status.success() {
                let stderr = String::from_utf8_lossy(&compile_result.stderr);
                return Err(format!("Compilation error: {}", stderr));
            }
        }

        let mut run_cmd = Command::new(&executable_file);
        run_cmd.current_dir(workspace_dir);

        if let Some(input) = &request.input {
            run_cmd.stdin(Stdio::piped())
                .stdout(Stdio::piped())
                .stderr(Stdio::piped());

            let mut child = run_cmd.spawn()
                .map_err(|e| format!("Failed to start execution: {}", e))?;


            if let Some(stdin) = child.stdin.take() {
                let mut stdin = stdin;
                stdin.write_all(input.as_bytes()).await
                    .map_err(|e| format!("Failed to write input: {}", e))?;
                stdin.shutdown().await
                    .map_err(|e| format!("Failed to close stdin: {}", e))?;
            }

            let output = timeout(timeout_duration, child.wait_with_output()).await
                .map_err(|_| "Execution timeout".to_string())?
                .map_err(|e| format!("Execution failed: {}", e))?;

            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                return Err(format!("Runtime error: {}", stderr));
            }

            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            let output = timeout(timeout_duration, run_cmd.output()).await
                .map_err(|_| "Execution timeout".to_string())?
                .map_err(|e| format!("Execution failed: {}", e))?;

            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                return Err(format!("Runtime error: {}", stderr));
            }

            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        }
    }

    async fn execute_java(
        &self,
        request: &CompileRequest,
        workspace_dir: &PathBuf,
        timeout_duration: Duration,
    ) -> Result<String, String> {

        let class_name = self.extract_java_class_name(&request.code)
            .unwrap_or_else(|| "Main".to_string());

        let source_file = workspace_dir.join(format!("{}.java", class_name));

        
        fs::write(&source_file, &request.code).await
            .map_err(|e| format!("Failed to write Java file: {}", e))?;

        
        let mut compile_cmd = Command::new("javac");
        compile_cmd.arg(&source_file)
            .current_dir(workspace_dir);

        let compile_result = timeout(timeout_duration, compile_cmd.output()).await
            .map_err(|_| "Java compilation timeout".to_string())?
            .map_err(|e| format!("Java compilation failed: {}", e))?;

        if !compile_result.status.success() {
            let stderr = String::from_utf8_lossy(&compile_result.stderr);
            return Err(format!("Java compilation error: {}", stderr));
        }

        
        let mut run_cmd = Command::new("java");
        run_cmd.arg(&class_name)
            .current_dir(workspace_dir);

        if let Some(input) = &request.input {
            run_cmd.stdin(Stdio::piped())
                .stdout(Stdio::piped())
                .stderr(Stdio::piped());

            let mut child = run_cmd.spawn()
                .map_err(|e| format!("Failed to start Java execution: {}", e))?;

            if let Some(stdin) = child.stdin.take() {
                let mut stdin = stdin;
                stdin.write_all(input.as_bytes()).await
                    .map_err(|e| format!("Failed to write input: {}", e))?;
                stdin.shutdown().await
                    .map_err(|e| format!("Failed to close stdin: {}", e))?;
            }

            let output = timeout(timeout_duration, child.wait_with_output()).await
                .map_err(|_| "Java execution timeout".to_string())?
                .map_err(|e| format!("Java execution failed: {}", e))?;

            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                return Err(format!("Java runtime error: {}", stderr));
            }

            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            let output = timeout(timeout_duration, run_cmd.output()).await
                .map_err(|_| "Java execution timeout".to_string())?
                .map_err(|e| format!("Java execution failed: {}", e))?;

            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                return Err(format!("Java runtime error: {}", stderr));
            }

            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        }
    }

    async fn execute_interpreted_language(
        &self,
        request: &CompileRequest,
        config: &LanguageConfig,
        workspace_dir: &PathBuf,
        timeout_duration: Duration,
    ) -> Result<String, String> {
        let source_file = workspace_dir.join(format!("main{}", config.file_extension));

        
        fs::write(&source_file, &request.code).await
            .map_err(|e| format!("Failed to write source file: {}", e))?;


        let mut cmd = Command::new(&config.run_command[0]);
        cmd.args(&config.run_command[1..])
            .arg(&source_file)
            .current_dir(workspace_dir);

        if let Some(input) = &request.input {
            cmd.stdin(Stdio::piped())
                .stdout(Stdio::piped())
                .stderr(Stdio::piped());

            let mut child = cmd.spawn()
                .map_err(|e| format!("Failed to start interpreter: {}", e))?;

            if let Some(stdin) = child.stdin.take() {
                let mut stdin = stdin;
                stdin.write_all(input.as_bytes()).await
                    .map_err(|e| format!("Failed to write input: {}", e))?;
                stdin.shutdown().await
                    .map_err(|e| format!("Failed to close stdin: {}", e))?;
            }

            let output = timeout(timeout_duration, child.wait_with_output()).await
                .map_err(|_| "Execution timeout".to_string())?
                .map_err(|e| format!("Execution failed: {}", e))?;

            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                return Err(format!("Runtime error: {}", stderr));
            }

            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            let output = timeout(timeout_duration, cmd.output()).await
                .map_err(|_| "Execution timeout".to_string())?
                .map_err(|e| format!("Execution failed: {}", e))?;

            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                return Err(format!("Runtime error: {}", stderr));
            }

            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        }
    }

    fn extract_java_class_name(&self, code: &str) -> Option<String> {
        for line in code.lines() {
            if line.trim().starts_with("public class ") {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 3 {
                    return Some(parts[2].replace("{", "").trim().to_string());
                }
            }
        }
        None
    }

    pub fn get_supported_languages(&self) -> Vec<crate::compiler::models::SupportedLanguage> {
        self.languages
            .iter()
            .map(|(key, config)| LanguageConfig::to_supported_language(key, config))
            .collect()
    }
} 
