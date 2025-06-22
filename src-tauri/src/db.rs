use rusqlite::{params, Connection, Result};
use uuid::Uuid;
use std::path::Path;
use std::fs;
use std::time::{SystemTime, UNIX_EPOCH};

const SCHEMA_SQL: &str = r#"
-- AI Providers Table
CREATE TABLE IF NOT EXISTS ai_providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    api_url TEXT NOT NULL,
    api_key_name TEXT NOT NULL,
    api_key TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- AI Models Table
CREATE TABLE IF NOT EXISTS ai_models (
    id TEXT PRIMARY KEY,
    provider_id TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (provider_id) REFERENCES ai_providers(id)
);

-- Chat Sessions Table
CREATE TABLE IF NOT EXISTS chat_sessions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    model_id TEXT,
    system_prompt TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (model_id) REFERENCES ai_models(id)
);

-- Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    reasoning TEXT,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
);

-- Assistants (Custom Prompts) Table
CREATE TABLE IF NOT EXISTS assistants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    system_prompt TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- App Settings Table
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Insert default settings
INSERT OR IGNORE INTO app_settings (key, value) VALUES ('theme', 'system');
"#;

// Add some predefined providers
const DEFAULT_PROVIDERS_SQL: &str = r#"
-- Add OpenAI as default provider
INSERT OR IGNORE INTO ai_providers (id, name, api_url, api_key_name, api_key, created_at, updated_at)
VALUES ('openai', 'OpenAI', 'https://api.openai.com', 'openai_api_key', NULL, unixepoch(), unixepoch());

-- Add Gemini as default provider
INSERT OR IGNORE INTO ai_providers (id, name, api_url, api_key_name, api_key, created_at, updated_at)
VALUES ('gemini', 'Google Gemini', 'https://generativelanguage.googleapis.com', 'gemini_api_key', NULL, unixepoch(), unixepoch());

-- Add DeepSeek as default provider
INSERT OR IGNORE INTO ai_providers (id, name, api_url, api_key_name, api_key, created_at, updated_at)
VALUES ('deepseek', 'DeepSeek API', 'https://api.deepseek.com', 'deepseek_api_key', NULL, unixepoch(), unixepoch());

-- Add Grok as default provider
INSERT OR IGNORE INTO ai_providers (id, name, api_url, api_key_name, api_key, created_at, updated_at)
VALUES ('grok', 'Grok', 'https://api.grok.x.ai', 'grok_api_key', NULL, unixepoch(), unixepoch());
"#;

// Add some predefined models
#[allow(dead_code)]
const DEFAULT_MODELS_SQL: &str = r#"
-- Add OpenAI models
INSERT OR IGNORE INTO ai_models (id, provider_id, name, created_at, updated_at)
VALUES ('openai-gpt-4o', 'openai', 'gpt-4o', unixepoch(), unixepoch());

INSERT OR IGNORE INTO ai_models (id, provider_id, name, created_at, updated_at)
VALUES ('openai-gpt-4o-mini', 'openai', 'gpt-4o-mini', unixepoch(), unixepoch());

-- Add Gemini models
INSERT OR IGNORE INTO ai_models (id, provider_id, name, created_at, updated_at)
VALUES ('gemini-1.5-pro', 'gemini', 'gemini-1.5-pro', unixepoch(), unixepoch());

INSERT OR IGNORE INTO ai_models (id, provider_id, name, created_at, updated_at)
VALUES ('gemini-1.5-flash', 'gemini', 'gemini-1.5-flash', unixepoch(), unixepoch());
"#;

// Helper function to get the current timestamp
pub fn get_current_timestamp() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64
}

// Initialize the database
pub fn init_db(app_data_dir: &Path) -> Result<Connection> {
    // Ensure the directory exists
    fs::create_dir_all(app_data_dir)
        .map_err(|e| rusqlite::Error::InvalidParameterName(format!("Failed to create directory: {}", e)))?;
    
    // Create the database file path
    let db_path = app_data_dir.join("aichat-pro.db");
    
    // Check if database already exists
    let db_exists = db_path.exists();
    
    // Open connection to the database
    let conn = Connection::open(db_path)
        .map_err(|e| rusqlite::Error::InvalidParameterName(format!("Failed to open database: {}", e)))?;
    
    // Execute schema SQL to create tables
    conn.execute_batch(SCHEMA_SQL)?;
    
    // Add default providers only
    conn.execute_batch(DEFAULT_PROVIDERS_SQL)?;
    
    // If database already existed, run migrations
    if db_exists {
        migrate_database(&conn)?;
    }
    
    Ok(conn)
}

// Migrate database to latest schema
fn migrate_database(conn: &Connection) -> Result<()> {
    // Check if api_key column exists in ai_providers table
    let has_api_key = conn.query_row(
        "SELECT COUNT(*) FROM pragma_table_info('ai_providers') WHERE name = 'api_key'",
        [],
        |row| row.get::<_, i64>(0)
    )?;
    
    // Add api_key column if it doesn't exist
    if has_api_key == 0 {
        conn.execute("ALTER TABLE ai_providers ADD COLUMN api_key TEXT", [])?;
    }
    
    Ok(())
}

// ====== AI Provider functions =======

#[derive(Debug, serde::Serialize)]
pub struct AIProvider {
    pub id: String,
    pub name: String,
    pub api_url: String,
    pub api_key_name: String,
    pub api_key: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

// Get all providers
pub fn get_all_providers(conn: &Connection) -> Result<Vec<AIProvider>> {
    let mut stmt = conn.prepare("SELECT id, name, api_url, api_key_name, api_key, created_at, updated_at FROM ai_providers")?;
    let provider_iter = stmt.query_map([], |row| {
        Ok(AIProvider {
            id: row.get(0)?,
            name: row.get(1)?,
            api_url: row.get(2)?,
            api_key_name: row.get(3)?,
            api_key: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    })?;

    let mut providers = Vec::new();
    for provider in provider_iter {
        providers.push(provider?);
    }
    Ok(providers)
}

// Add a new provider
#[allow(dead_code)]
pub fn add_provider(conn: &Connection, name: &str, api_url: &str, api_key_name: &str, api_key: &str) -> Result<String> {
    let id = Uuid::new_v4().to_string();
    let timestamp = get_current_timestamp();
    
    conn.execute(
        "INSERT INTO ai_providers (id, name, api_url, api_key_name, api_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        params![id, name, api_url, api_key_name, api_key, timestamp, timestamp],
    )?;
    
    Ok(id)
}

// Update a provider
pub fn update_provider(conn: &Connection, id: &str, name: &str, api_url: &str, api_key_name: &str, api_key: Option<&str>) -> Result<()> {
    let timestamp = get_current_timestamp();
    
    if let Some(key) = api_key {
        // Update with new API key
        conn.execute(
            "UPDATE ai_providers SET name = ?, api_url = ?, api_key_name = ?, api_key = ?, updated_at = ? WHERE id = ?",
            params![name, api_url, api_key_name, key, timestamp, id],
        )?;
    } else {
        // Keep existing API key
        conn.execute(
            "UPDATE ai_providers SET name = ?, api_url = ?, api_key_name = ?, updated_at = ? WHERE id = ?",
            params![name, api_url, api_key_name, timestamp, id],
        )?;
    }
    
    Ok(())
}

// Delete a provider
pub fn delete_provider(conn: &mut Connection, id: &str) -> Result<()> {
    println!("DB: Starting delete_provider for ID: {}", id);
    
    // Begin transaction
    let tx = match conn.transaction() {
        Ok(tx) => {
            println!("DB: Transaction started successfully");
            tx
        },
        Err(e) => {
            println!("DB: Failed to start transaction: {}", e);
            return Err(e);
        }
    };
    
    // First, get all models for this provider
    println!("DB: Getting models for provider: {}", id);
    let models = get_models_by_provider(&tx, id)?;
    let model_ids: Vec<String> = models.iter().map(|m| m.id.clone()).collect();
    println!("DB: Found {} models to process", model_ids.len());
    
    // Update chat sessions that use any of these models to set model_id to NULL
    for model_id in &model_ids {
        println!("DB: Updating chat sessions for model: {}", model_id);
        match tx.execute(
            "UPDATE chat_sessions SET model_id = NULL WHERE model_id = ?",
            params![model_id],
        ) {
            Ok(count) => println!("DB: Updated {} chat sessions", count),
            Err(e) => {
                println!("DB: Failed to update chat sessions: {}", e);
                return Err(e);
            }
        }
    }
    
    // Delete all models associated with this provider
    println!("DB: Deleting models for provider: {}", id);
    match tx.execute("DELETE FROM ai_models WHERE provider_id = ?", params![id]) {
        Ok(count) => println!("DB: Deleted {} models", count),
        Err(e) => {
            println!("DB: Failed to delete models: {}", e);
            return Err(e);
        }
    }
    
    // Then delete the provider itself
    println!("DB: Deleting provider: {}", id);
    match tx.execute("DELETE FROM ai_providers WHERE id = ?", params![id]) {
        Ok(count) => {
            if count == 0 {
                println!("DB: Warning: No provider found with ID: {}", id);
            } else {
                println!("DB: Successfully deleted provider");
            }
        },
        Err(e) => {
            println!("DB: Failed to delete provider: {}", e);
            return Err(e);
        }
    }
    
    // Commit transaction
    println!("DB: Committing transaction");
    match tx.commit() {
        Ok(_) => println!("DB: Transaction committed successfully"),
        Err(e) => {
            println!("DB: Failed to commit transaction: {}", e);
            return Err(e);
        }
    }
    
    println!("DB: Provider deletion completed successfully");
    Ok(())
}

// Get a provider by ID
pub fn get_provider_by_id(conn: &Connection, id: &str) -> Result<Option<AIProvider>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, api_url, api_key_name, api_key, created_at, updated_at FROM ai_providers WHERE id = ?"
    )?;
    
    let provider = stmt.query_row(params![id], |row| {
        Ok(AIProvider {
            id: row.get(0)?,
            name: row.get(1)?,
            api_url: row.get(2)?,
            api_key_name: row.get(3)?,
            api_key: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    });
    
    match provider {
        Ok(p) => Ok(Some(p)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e),
    }
}

// Add a new provider with custom ID
pub fn add_provider_with_id(conn: &Connection, id: &str, name: &str, api_url: &str, api_key_name: &str, api_key: &str) -> Result<String> {
    let timestamp = get_current_timestamp();
    
    conn.execute(
        "INSERT INTO ai_providers (id, name, api_url, api_key_name, api_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        params![id, name, api_url, api_key_name, api_key, timestamp, timestamp],
    )?;
    
    Ok(id.to_string())
}

// ====== AI Model functions =======

#[derive(Debug, serde::Serialize)]
pub struct AIModel {
    pub id: String,
    pub provider_id: String,
    pub name: String,
    pub created_at: i64,
    pub updated_at: i64,
}

// Get all models for a provider
pub fn get_models_by_provider(conn: &Connection, provider_id: &str) -> Result<Vec<AIModel>> {
    let mut stmt = conn.prepare(
        "SELECT id, provider_id, name, created_at, updated_at FROM ai_models WHERE provider_id = ?"
    )?;
    
    let model_iter = stmt.query_map(params![provider_id], |row| {
        Ok(AIModel {
            id: row.get(0)?,
            provider_id: row.get(1)?,
            name: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
        })
    })?;

    let mut models = Vec::new();
    for model in model_iter {
        models.push(model?);
    }
    Ok(models)
}

// Add a new model
pub fn add_model(conn: &Connection, provider_id: &str, name: &str) -> Result<String> {
    let id = Uuid::new_v4().to_string();
    let timestamp = get_current_timestamp();
    
    conn.execute(
        "INSERT INTO ai_models (id, provider_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        params![id, provider_id, name, timestamp, timestamp],
    )?;
    
    Ok(id)
}

// Delete a model
pub fn delete_model(conn: &mut Connection, id: &str) -> Result<()> {
    // Begin transaction
    let tx = conn.transaction()?;
    
    // First update any chat sessions that use this model to set model_id to NULL
    tx.execute(
        "UPDATE chat_sessions SET model_id = NULL WHERE model_id = ?",
        params![id]
    )?;
    
    // Then delete the model itself
    tx.execute("DELETE FROM ai_models WHERE id = ?", params![id])?;
    
    // Commit transaction
    tx.commit()?;
    
    Ok(())
}

// ====== Chat Session functions =======

#[derive(Debug, serde::Serialize)]
pub struct ChatSession {
    pub id: String,
    pub name: String,
    pub model_id: Option<String>,
    pub system_prompt: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

// Get all chat sessions
pub fn get_all_chat_sessions(conn: &Connection) -> Result<Vec<ChatSession>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, model_id, system_prompt, created_at, updated_at FROM chat_sessions ORDER BY updated_at DESC"
    )?;
    
    let session_iter = stmt.query_map([], |row| {
        Ok(ChatSession {
            id: row.get(0)?,
            name: row.get(1)?,
            model_id: row.get(2)?,
            system_prompt: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
        })
    })?;

    let mut sessions = Vec::new();
    for session in session_iter {
        sessions.push(session?);
    }
    Ok(sessions)
}

// Create a new chat session
pub fn create_chat_session(conn: &Connection, name: &str, model_id: Option<&str>, system_prompt: Option<&str>) -> Result<String> {
    let id = Uuid::new_v4().to_string();
    let timestamp = get_current_timestamp();
    
    conn.execute(
        "INSERT INTO chat_sessions (id, name, model_id, system_prompt, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?)",
        params![id, name, model_id, system_prompt, timestamp, timestamp],
    )?;
    
    Ok(id)
}

// Update a chat session
pub fn update_chat_session(conn: &Connection, id: &str, name: &str, model_id: Option<&str>, system_prompt: Option<&str>) -> Result<()> {
    let timestamp = get_current_timestamp();
    
    conn.execute(
        "UPDATE chat_sessions SET name = ?, model_id = ?, system_prompt = ?, updated_at = ? WHERE id = ?",
        params![name, model_id, system_prompt, timestamp, id],
    )?;
    
    Ok(())
}

// Delete a chat session
pub fn delete_chat_session(conn: &mut Connection, id: &str) -> Result<()> {
    println!("DB: Starting delete_chat_session for ID: {}", id);
    
    // Begin transaction
    let tx = match conn.transaction() {
        Ok(tx) => {
            println!("DB: Transaction started successfully");
            tx
        },
        Err(e) => {
            println!("DB: Failed to start transaction: {}", e);
            return Err(e);
        }
    };
    
    // First delete all messages in the session
    println!("DB: Deleting messages for session: {}", id);
    match tx.execute("DELETE FROM chat_messages WHERE session_id = ?", params![id]) {
        Ok(count) => println!("DB: Deleted {} messages", count),
        Err(e) => {
            println!("DB: Failed to delete messages: {}", e);
            return Err(e);
        }
    }
    
    // Then delete the session itself
    println!("DB: Deleting session: {}", id);
    match tx.execute("DELETE FROM chat_sessions WHERE id = ?", params![id]) {
        Ok(count) => {
            if count == 0 {
                println!("DB: Warning: No session found with ID: {}", id);
            } else {
                println!("DB: Successfully deleted session");
            }
        },
        Err(e) => {
            println!("DB: Failed to delete session: {}", e);
            return Err(e);
        }
    }
    
    // Commit transaction
    println!("DB: Committing transaction");
    match tx.commit() {
        Ok(_) => println!("DB: Transaction committed successfully"),
        Err(e) => {
            println!("DB: Failed to commit transaction: {}", e);
            return Err(e);
        }
    }
    
    println!("DB: Session deletion completed successfully");
    Ok(())
}

// Get a chat session by ID
pub fn get_chat_session_by_id(conn: &Connection, id: &str) -> Result<Option<ChatSession>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, model_id, system_prompt, created_at, updated_at FROM chat_sessions WHERE id = ?"
    )?;
    
    let session = stmt.query_row(params![id], |row| {
        Ok(ChatSession {
            id: row.get(0)?,
            name: row.get(1)?,
            model_id: row.get(2)?,
            system_prompt: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
        })
    });
    
    match session {
        Ok(s) => Ok(Some(s)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e),
    }
}

// ====== Chat Message functions =======

#[derive(Debug, serde::Serialize)]
pub struct ChatMessage {
    pub id: String,
    pub session_id: String,
    pub role: String,
    pub content: String,
    pub reasoning: Option<String>,
    pub timestamp: i64,
}

// Get all messages for a chat session
pub fn get_messages_by_session(conn: &Connection, session_id: &str) -> Result<Vec<ChatMessage>> {
    let mut stmt = conn.prepare(
        "SELECT id, session_id, role, content, reasoning, timestamp FROM chat_messages 
         WHERE session_id = ? ORDER BY timestamp ASC"
    )?;
    
    let message_iter = stmt.query_map(params![session_id], |row| {
        Ok(ChatMessage {
            id: row.get(0)?,
            session_id: row.get(1)?,
            role: row.get(2)?,
            content: row.get(3)?,
            reasoning: row.get(4)?,
            timestamp: row.get(5)?,
        })
    })?;

    let mut messages = Vec::new();
    for message in message_iter {
        messages.push(message?);
    }
    Ok(messages)
}

// Add a new message to a chat session
pub fn add_message(
    conn: &Connection,
    session_id: &str,
    role: &str,
    content: &str,
    reasoning: Option<&str>
) -> Result<String> {
    let id = Uuid::new_v4().to_string();
    let timestamp = get_current_timestamp();
    
    conn.execute(
        "INSERT INTO chat_messages (id, session_id, role, content, reasoning, timestamp) 
         VALUES (?, ?, ?, ?, ?, ?)",
        params![id, session_id, role, content, reasoning, timestamp],
    )?;
    
    // Update the session's updated_at timestamp
    conn.execute(
        "UPDATE chat_sessions SET updated_at = ? WHERE id = ?",
        params![timestamp, session_id],
    )?;
    
    Ok(id)
}

// ====== Assistant functions =======

#[derive(Debug, serde::Serialize)]
pub struct Assistant {
    pub id: String,
    pub name: String,
    pub description: String,
    pub system_prompt: String,
    pub created_at: i64,
    pub updated_at: i64,
}

// Get all assistants
pub fn get_all_assistants(conn: &Connection) -> Result<Vec<Assistant>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, description, system_prompt, created_at, updated_at FROM assistants ORDER BY name ASC"
    )?;
    
    let assistant_iter = stmt.query_map([], |row| {
        Ok(Assistant {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            system_prompt: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
        })
    })?;

    let mut assistants = Vec::new();
    for assistant in assistant_iter {
        assistants.push(assistant?);
    }
    Ok(assistants)
}

// Create a new assistant
pub fn create_assistant(conn: &Connection, name: &str, description: &str, system_prompt: &str) -> Result<String> {
    let id = Uuid::new_v4().to_string();
    let timestamp = get_current_timestamp();
    
    conn.execute(
        "INSERT INTO assistants (id, name, description, system_prompt, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?)",
        params![id, name, description, system_prompt, timestamp, timestamp],
    )?;
    
    Ok(id)
}

// Update an assistant
pub fn update_assistant(conn: &Connection, id: &str, name: &str, description: &str, system_prompt: &str) -> Result<()> {
    let timestamp = get_current_timestamp();
    
    conn.execute(
        "UPDATE assistants SET name = ?, description = ?, system_prompt = ?, updated_at = ? WHERE id = ?",
        params![name, description, system_prompt, timestamp, id],
    )?;
    
    Ok(())
}

// Delete an assistant
pub fn delete_assistant(conn: &mut Connection, id: &str) -> Result<()> {
    println!("DB: Starting delete_assistant for ID: {}", id);
    
    // Begin transaction
    let tx = match conn.transaction() {
        Ok(tx) => {
            println!("DB: Transaction started successfully");
            tx
        },
        Err(e) => {
            println!("DB: Failed to start transaction: {}", e);
            return Err(e);
        }
    };
    
    // Delete the assistant
    println!("DB: Deleting assistant: {}", id);
    match tx.execute("DELETE FROM assistants WHERE id = ?", params![id]) {
        Ok(count) => {
            if count == 0 {
                println!("DB: Warning: No assistant found with ID: {}", id);
            } else {
                println!("DB: Successfully deleted assistant");
            }
        },
        Err(e) => {
            println!("DB: Failed to delete assistant: {}", e);
            return Err(e);
        }
    }
    
    // Commit transaction
    println!("DB: Committing transaction");
    match tx.commit() {
        Ok(_) => println!("DB: Transaction committed successfully"),
        Err(e) => {
            println!("DB: Failed to commit transaction: {}", e);
            return Err(e);
        }
    }
    
    println!("DB: Assistant deletion completed successfully");
    Ok(())
}

// Get an assistant by ID
pub fn get_assistant_by_id(conn: &Connection, id: &str) -> Result<Option<Assistant>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, description, system_prompt, created_at, updated_at FROM assistants WHERE id = ?"
    )?;
    
    let assistant = stmt.query_row(params![id], |row| {
        Ok(Assistant {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            system_prompt: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
        })
    });
    
    match assistant {
        Ok(a) => Ok(Some(a)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e),
    }
}

// ====== Settings functions =======

// Get a setting
pub fn get_setting(conn: &Connection, key: &str) -> Result<Option<String>> {
    let mut stmt = conn.prepare("SELECT value FROM app_settings WHERE key = ?")?;
    
    let value = stmt.query_row(params![key], |row| {
        row.get::<_, String>(0)
    });
    
    match value {
        Ok(v) => Ok(Some(v)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e),
    }
}

// Set a setting
pub fn set_setting(conn: &Connection, key: &str, value: &str) -> Result<()> {
    conn.execute(
        "INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)",
        params![key, value],
    )?;
    
    Ok(())
} 