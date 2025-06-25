// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;
use std::path::PathBuf;
use std::fs;
use rusqlite::Connection;
use tauri::State;
use serde::Deserialize;
use uuid::Uuid;

mod db;
mod ai;

// Structures for Tauri command parameters and responses

// App state
struct AppState {
    db_conn: Mutex<Connection>,
    ai_client: Mutex<ai::AIClient>,
}

#[derive(Deserialize)]
struct ProviderRequest {
    name: String,
    api_url: String,
    api_key: String,
    id_prefix: Option<String>,
}

#[derive(Deserialize)]
struct ProviderUpdateRequest {
    id: String,
    name: String,
    api_url: String,
    api_key: Option<String>,
}

#[derive(Deserialize)]
struct ModelRequest {
    provider_id: String,
    name: String,
}

#[derive(Deserialize)]
struct ChatSessionRequest {
    id: Option<String>,
    name: String,
    model_id: Option<String>,
    system_prompt: Option<String>,
}

#[derive(Deserialize)]
#[allow(dead_code)]
struct ChatSessionUpdateRequest {
    id: String,
    name: String,
    model_id: Option<String>,
    system_prompt: Option<String>,
}

#[derive(Deserialize)]
struct ChatMessageRequest {
    session_id: String,
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct AssistantRequest {
    name: String,
    description: String,
    system_prompt: String,
}

#[derive(Deserialize)]
struct AssistantUpdateRequest {
    id: String,
    name: String,
    description: String,
    system_prompt: String,
}

#[derive(Deserialize)]
struct SettingRequest {
    key: String,
    value: String,
}

#[derive(Deserialize)]
struct ChatRequest {
    provider_id: String,
    model_id: String,
    messages: Vec<ai::ChatMessage>,
}

#[derive(Deserialize)]
struct VerifyModelRequest {
    provider_id: String,
    model_name: String,
}

// Get the application data directory
fn get_app_data_dir() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or_else(|| "Could not find home directory".to_string())?;
    let data_dir = home.join(".aichat-pro");
    
    // Ensure directory exists
    fs::create_dir_all(&data_dir)
        .map_err(|e| format!("Could not create app data directory: {}", e))?;
    
    Ok(data_dir)
}

// Initialize the database
fn init_database() -> Result<Connection, String> {
    let data_dir = get_app_data_dir()?;
    db::init_db(&data_dir).map_err(|e| format!("Could not initialize database: {}", e))
}

// Tauri commands for AI providers
#[tauri::command]
async fn get_providers(app_state: State<'_, AppState>) -> Result<Vec<db::AIProvider>, String> {
    let conn = app_state.db_conn.lock().map_err(|e| e.to_string())?;
    db::get_all_providers(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
async fn add_provider(
    app_state: State<'_, AppState>,
    provider: ProviderRequest
) -> Result<String, String> {
    // 生成 ID，如果提供了前缀则使用前缀
    let id = if let Some(prefix) = &provider.id_prefix {
        format!("{}-{}", prefix, Uuid::new_v4().to_string().split('-').next().unwrap())
    } else {
        Uuid::new_v4().to_string()
    };
    
    // Add provider to database with API key
    let conn = app_state.db_conn.lock().map_err(|e| e.to_string())?;
    db::add_provider_with_id(&conn, &id, &provider.name, &provider.api_url, &provider.name, &provider.api_key)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_provider(
    app_state: State<'_, AppState>,
    provider: ProviderUpdateRequest
) -> Result<(), String> {
    let conn = app_state.db_conn.lock().map_err(|e| e.to_string())?;
    
    // Get current provider to get api_key_name
    let current = db::get_provider_by_id(&conn, &provider.id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Provider not found".to_string())?;
    
    // Update provider in database with API key if provided
    db::update_provider(
        &conn, 
        &provider.id, 
        &provider.name, 
        &provider.api_url, 
        &current.api_key_name,
        provider.api_key.as_deref()
    ).map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_provider(
    app_state: State<'_, AppState>,
    id: String
) -> Result<String, String> {
    println!("Received delete_provider request for ID: {}", id);
    
    let mut conn = match app_state.db_conn.lock() {
        Ok(conn) => conn,
        Err(e) => {
            let err_msg = format!("Failed to lock database connection: {}", e);
            println!("{}", err_msg);
            return Err(err_msg);
        }
    };
    
    // Delete provider from database (this will cascade delete models too)
    match db::delete_provider(&mut conn, &id) {
        Ok(_) => {
            let msg = format!("Successfully deleted provider with ID: {}", id);
            println!("{}", msg);
            Ok(msg)
        },
        Err(e) => {
            let err_msg = format!("Failed to delete provider: {}", e);
            println!("{}", err_msg);
            Err(err_msg)
        }
    }
}

// Tauri commands for AI models
#[tauri::command]
async fn get_models(
    app_state: State<'_, AppState>,
    provider_id: String
) -> Result<Vec<db::AIModel>, String> {
    let conn = app_state.db_conn.lock().map_err(|e| e.to_string())?;
    db::get_models_by_provider(&conn, &provider_id).map_err(|e| e.to_string())
}

#[tauri::command]
async fn add_model(
    app_state: State<'_, AppState>,
    model: ModelRequest
) -> Result<String, String> {
    let conn = app_state.db_conn.lock().map_err(|e| e.to_string())?;
    db::add_model(&conn, &model.provider_id, &model.name).map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_model(
    app_state: State<'_, AppState>,
    id: String
) -> Result<(), String> {
    let mut conn = app_state.db_conn.lock().map_err(|e| e.to_string())?;
    db::delete_model(&mut conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
async fn fetch_models_from_provider(
    app_state: State<'_, AppState>,
    provider_id: String
) -> Result<Vec<String>, String> {
    // Get provider details from database
    let provider = {
        let conn = app_state.db_conn.lock().map_err(|e| e.to_string())?;
        db::get_provider_by_id(&conn, &provider_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Provider not found".to_string())?
    };

    // Check if API key is set
    if provider.api_key.is_none() {
        return Err("API key not set for this provider. Please set an API key in the Providers page.".to_string());
    }

    let api_url = provider.api_url.clone();
    let api_key = provider.api_key.unwrap();

    let ai_client = {
        let guard = app_state.ai_client.lock().map_err(|e| e.to_string())?;
        guard.clone()
    };

    // Determine provider type based on ID prefix, API URL, or name
    let provider_type = determine_provider_type(&provider_id, &api_url, &provider.name);

    match provider_type.as_str() {
        "openai" => {
            ai_client.fetch_openai_models(&api_url, &api_key)
                .await
                .map_err(|e| e.to_string())
        },
        "deepseek" => {
            // DeepSeek uses OpenAI-compatible API
            ai_client.fetch_openai_models(&api_url, &api_key)
                .await
                .map_err(|e| e.to_string())
        },
        "grok" => {
            // Grok uses OpenAI-compatible API
            ai_client.fetch_openai_models(&api_url, &api_key)
                .await
                .map_err(|e| e.to_string())
        },
        "gemini" => {
            // For now, return some common Gemini models
            // TODO: Implement actual Gemini models API call
            Ok(vec![
                "gemini-1.5-pro".to_string(),
                "gemini-1.5-flash".to_string(),
                "gemini-1.0-pro".to_string(),
            ])
        },
        "custom" => {
            // For custom providers, default to OpenAI-compatible API
            ai_client.fetch_openai_models(&api_url, &api_key)
                .await
                .map_err(|e| format!("Custom provider API error: {}. This provider might not support model listing or might not be OpenAI-compatible.", e))
        },
        _ => {
            // Default to OpenAI-compatible API for unknown types
            ai_client.fetch_openai_models(&api_url, &api_key)
                .await
                .map_err(|e| format!("Unknown provider type '{}', tried OpenAI-compatible API: {}", provider_type, e))
        }
    }
}

// Helper function to determine provider type
fn determine_provider_type(provider_id: &str, api_url: &str, provider_name: &str) -> String {
    // Check ID prefix first (most reliable)
    if provider_id.starts_with("openai") {
        return "openai".to_string();
    }
    if provider_id.starts_with("deepseek") {
        return "deepseek".to_string();
    }
    if provider_id.starts_with("grok") {
        return "grok".to_string();
    }
    if provider_id.starts_with("gemini") {
        return "gemini".to_string();
    }
    if provider_id.starts_with("custom") {
        return "custom".to_string();
    }

    // Check API URL (second priority)
    let api_url_lower = api_url.to_lowercase();
    if api_url_lower.contains("openai.com") {
        return "openai".to_string();
    }
    if api_url_lower.contains("deepseek.com") {
        return "deepseek".to_string();
    }
    if api_url_lower.contains("grok.x.ai") || api_url_lower.contains("x.ai") {
        return "grok".to_string();
    }
    if api_url_lower.contains("googleapis.com") || api_url_lower.contains("generativelanguage") {
        return "gemini".to_string();
    }

    // Check provider name as fallback (third priority)
    let name_lower = provider_name.to_lowercase();
    if name_lower.contains("openai") {
        return "openai".to_string();
    }
    if name_lower.contains("deepseek") {
        return "deepseek".to_string();
    }
    if name_lower.contains("grok") {
        return "grok".to_string();
    }
    if name_lower.contains("gemini") {
        return "gemini".to_string();
    }

    // Default to custom (which will use OpenAI-compatible API)
    "custom".to_string()
}

// Tauri commands for chat sessions
#[tauri::command]
async fn get_chat_sessions(app_state: State<'_, AppState>) -> Result<Vec<db::ChatSession>, String> {
    let conn = app_state.db_conn.lock().map_err(|e| e.to_string())?;
    db::get_all_chat_sessions(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_chat_session(
    app_state: State<'_, AppState>,
    session: ChatSessionRequest
) -> Result<String, String> {
    let conn = app_state.db_conn.lock().map_err(|e| e.to_string())?;
    db::create_chat_session(&conn, &session.name, session.model_id.as_deref(), session.system_prompt.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_chat_session(
    app_state: State<'_, AppState>,
    session: ChatSessionRequest
) -> Result<(), String> {
    let conn = app_state.db_conn.lock().map_err(|e| e.to_string())?;
    
    if let Some(id) = session.id {
        db::update_chat_session(&conn, &id, &session.name, session.model_id.as_deref(), session.system_prompt.as_deref())
            .map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Session ID is required for update".to_string())
    }
}

#[tauri::command]
async fn delete_chat_session(
    app_state: State<'_, AppState>,
    id: String
) -> Result<String, String> {
    println!("Received delete_chat_session request for ID: {}", id);
    
    let mut conn = match app_state.db_conn.lock() {
        Ok(conn) => conn,
        Err(e) => {
            let err_msg = format!("Failed to lock database connection: {}", e);
            println!("{}", err_msg);
            return Err(err_msg);
        }
    };
    
    // Delete chat session from database
    match db::delete_chat_session(&mut conn, &id) {
        Ok(_) => {
            let msg = format!("Successfully deleted chat session with ID: {}", id);
            println!("{}", msg);
            Ok(msg)
        },
        Err(e) => {
            let err_msg = format!("Failed to delete chat session: {}", e);
            println!("{}", err_msg);
            Err(err_msg)
        }
    }
}

#[tauri::command]
async fn get_chat_session(
    app_state: State<'_, AppState>,
    id: String
) -> Result<Option<db::ChatSession>, String> {
    let conn = app_state.db_conn.lock().map_err(|e| e.to_string())?;
    db::get_chat_session_by_id(&conn, &id).map_err(|e| e.to_string())
}

// Tauri commands for chat messages
#[tauri::command]
async fn get_chat_messages(
    app_state: State<'_, AppState>,
    session_id: String
) -> Result<Vec<db::ChatMessage>, String> {
    let conn = app_state.db_conn.lock().map_err(|e| e.to_string())?;
    db::get_messages_by_session(&conn, &session_id).map_err(|e| e.to_string())
}

#[tauri::command]
async fn add_chat_message(
    app_state: State<'_, AppState>,
    message: ChatMessageRequest
) -> Result<String, String> {
    let conn = app_state.db_conn.lock().map_err(|e| e.to_string())?;
    db::add_message(&conn, &message.session_id, &message.role, &message.content, None)
        .map_err(|e| e.to_string())
}

// Tauri commands for assistants
#[tauri::command]
async fn get_assistants(app_state: State<'_, AppState>) -> Result<Vec<db::Assistant>, String> {
    let conn = app_state.db_conn.lock().map_err(|e| e.to_string())?;
    db::get_all_assistants(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_assistant(
    app_state: State<'_, AppState>,
    assistant: AssistantRequest
) -> Result<String, String> {
    let conn = app_state.db_conn.lock().map_err(|e| e.to_string())?;
    db::create_assistant(&conn, &assistant.name, &assistant.description, &assistant.system_prompt)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_assistant(
    app_state: State<'_, AppState>,
    assistant: AssistantUpdateRequest
) -> Result<(), String> {
    let conn = app_state.db_conn.lock().map_err(|e| e.to_string())?;
    db::update_assistant(&conn, &assistant.id, &assistant.name, &assistant.description, &assistant.system_prompt)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_assistant(
    app_state: State<'_, AppState>,
    id: String
) -> Result<String, String> {
    println!("Received delete_assistant request for ID: {}", id);
    
    let mut conn = match app_state.db_conn.lock() {
        Ok(conn) => conn,
        Err(e) => {
            let err_msg = format!("Failed to lock database connection: {}", e);
            println!("{}", err_msg);
            return Err(err_msg);
        }
    };
    
    // Delete assistant from database
    match db::delete_assistant(&mut conn, &id) {
        Ok(_) => {
            let msg = format!("Successfully deleted assistant with ID: {}", id);
            println!("{}", msg);
            Ok(msg)
        },
        Err(e) => {
            let err_msg = format!("Failed to delete assistant: {}", e);
            println!("{}", err_msg);
            Err(err_msg)
        }
    }
}

#[tauri::command]
async fn get_assistant(
    app_state: State<'_, AppState>,
    id: String
) -> Result<Option<db::Assistant>, String> {
    let conn = app_state.db_conn.lock().map_err(|e| e.to_string())?;
    db::get_assistant_by_id(&conn, &id).map_err(|e| e.to_string())
}

// Tauri commands for settings
#[tauri::command]
async fn get_setting(
    app_state: State<'_, AppState>,
    key: String
) -> Result<Option<String>, String> {
    let conn = app_state.db_conn.lock().map_err(|e| e.to_string())?;
    db::get_setting(&conn, &key).map_err(|e| e.to_string())
}

#[tauri::command]
async fn set_setting(
    app_state: State<'_, AppState>,
    setting: SettingRequest
) -> Result<(), String> {
    let conn = app_state.db_conn.lock().map_err(|e| e.to_string())?;
    db::set_setting(&conn, &setting.key, &setting.value).map_err(|e| e.to_string())
}

// Tauri command for sending AI requests
#[tauri::command]
async fn send_chat_request(
    app_state: State<'_, AppState>,
    request: ChatRequest
) -> Result<ai::AIResponse, String> {
    // Get provider and model details
    let provider = {
        let conn = app_state.db_conn.lock().map_err(|e| e.to_string())?;
        db::get_provider_by_id(&conn, &request.provider_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Provider not found".to_string())?
    };
    
    // Check if API key is set
    if provider.api_key.is_none() {
        return Err("API key not set for this provider. Please set an API key in the Providers page.".to_string());
    }
    
    // Get the actual model name from the database
    let model_name = {
        let conn = app_state.db_conn.lock().map_err(|e| e.to_string())?;
        let models = db::get_models_by_provider(&conn, &request.provider_id)
            .map_err(|e| e.to_string())?;
        
        let model = models.iter()
            .find(|m| m.id == request.model_id)
            .ok_or_else(|| format!("Model with ID {} not found", request.model_id))?;
        
        model.name.clone()
    };
    
    // Get information needed for API call
    let api_url = provider.api_url.clone();
    let api_key = provider.api_key.unwrap();
    let provider_name = provider.name.clone();
    let messages = request.messages.clone();
    
    // Get a cloned copy of the AI client
    let ai_client = {
        let guard = app_state.ai_client.lock().map_err(|e| e.to_string())?;
        guard.clone()
    };
    
    // Determine provider type using the same logic as fetch_models_from_provider
    let provider_type = determine_provider_type(&request.provider_id, &api_url, &provider_name);

    // Call appropriate API based on provider type
    match provider_type.as_str() {
        "openai" => {
            ai_client.openai_chat(&api_url, &api_key, &model_name, messages).await
        },
        "deepseek" => {
            // DeepSeek uses OpenAI-compatible API
            ai_client.openai_chat(&api_url, &api_key, &model_name, messages).await
        },
        "grok" => {
            // Grok uses OpenAI-compatible API
            ai_client.openai_chat(&api_url, &api_key, &model_name, messages).await
        },
        "gemini" => {
            ai_client.gemini_chat(&api_url, &api_key, &model_name, messages).await
        },
        "custom" => {
            // For custom providers, default to OpenAI-compatible API
            ai_client.openai_chat(&api_url, &api_key, &model_name, messages).await
        },
        _ => {
            // Default to OpenAI-compatible API for unknown types
            ai_client.openai_chat(&api_url, &api_key, &model_name, messages).await
        }
    }.map_err(|e| e.to_string())
}

#[tauri::command]
async fn verify_model(
    app_state: State<'_, AppState>,
    request: VerifyModelRequest,
) -> Result<bool, String> {
    // Get provider information
    let provider = {
        let conn = app_state.db_conn.lock().unwrap();
        db::get_provider_by_id(&conn, &request.provider_id)
            .map_err(|e| e.to_string())?
            .ok_or("Provider not found")?
    };

    // Check if API key is available
    let api_key = provider.api_key.as_ref().ok_or("API key not found for provider")?;

    // Clone necessary data before async operations
    let api_url = provider.api_url.clone();
    let api_key = api_key.clone();
    let provider_name = provider.name.clone();

    // Determine provider type
    let provider_type = determine_provider_type(&request.provider_id, &api_url, &provider_name);

    // Try to send a simple test message to verify the model works
    let test_messages = vec![
        ai::ChatMessage {
            role: "user".to_string(),
            content: "Hello".to_string(),
        }
    ];

    // Get AI client and clone it for async use
    let ai_client = {
        let client = app_state.ai_client.lock().unwrap();
        client.clone()
    };

    // Call appropriate API based on provider type
    let result = match provider_type.as_str() {
        "openai" => {
            ai_client.openai_chat(&api_url, &api_key, &request.model_name, test_messages).await
        },
        "deepseek" => {
            // DeepSeek uses OpenAI-compatible API
            ai_client.openai_chat(&api_url, &api_key, &request.model_name, test_messages).await
        },
        "grok" => {
            // Grok uses OpenAI-compatible API
            ai_client.openai_chat(&api_url, &api_key, &request.model_name, test_messages).await
        },
        "gemini" => {
            ai_client.gemini_chat(&api_url, &api_key, &request.model_name, test_messages).await
        },
        "custom" => {
            // For custom providers, default to OpenAI-compatible API
            ai_client.openai_chat(&api_url, &api_key, &request.model_name, test_messages).await
        },
        _ => {
            // Default to OpenAI-compatible API for unknown types
            ai_client.openai_chat(&api_url, &api_key, &request.model_name, test_messages).await
        }
    };

    // Return true if the request was successful, error message if failed
    match result {
        Ok(_) => Ok(true),
        Err(e) => {
            // Log the error for debugging
            eprintln!("Model verification failed: {}", e);
            // Return false for verification failure, but don't expose sensitive error details
            Ok(false)
        }
    }
}

#[tokio::main]
async fn main() {
    // Initialize database and AI client before creating the app
    let db_conn = init_database().expect("Could not initialize database");
    let ai_client = ai::AIClient::new();
    
    tauri::Builder::default()
        .manage(AppState {
            db_conn: Mutex::new(db_conn),
            ai_client: Mutex::new(ai_client),
        })
        .invoke_handler(tauri::generate_handler![
            // Provider commands
            get_providers,
            add_provider,
            update_provider,
            delete_provider,
            
            // Model commands
            get_models,
            add_model,
            delete_model,
            fetch_models_from_provider,
            
            // Chat session commands
            get_chat_sessions,
            create_chat_session,
            update_chat_session,
            delete_chat_session,
            get_chat_session,
            
            // Chat message commands
            get_chat_messages,
            add_chat_message,
            
            // Assistant commands
            get_assistants,
            create_assistant,
            update_assistant,
            delete_assistant,
            get_assistant,
            
            // Settings commands
            get_setting,
            set_setting,
            
            // AI commands
            send_chat_request,
            verify_model,
        ])
        .run(tauri::generate_context!())
        .expect("Error while running tauri application");
}
