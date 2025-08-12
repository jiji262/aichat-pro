use serde::{Deserialize, Serialize};
use std::error::Error;
use std::fmt;
use reqwest::Client;

#[derive(Debug)]
pub enum AIError {
    HttpError(reqwest::Error),
    SerdeError(serde_json::Error),
    APIError(String),
}

impl fmt::Display for AIError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AIError::HttpError(e) => write!(f, "HTTP request error: {}", e),
            AIError::SerdeError(e) => write!(f, "JSON serialization error: {}", e),
            AIError::APIError(e) => write!(f, "API error: {}", e),
        }
    }
}

impl Error for AIError {}

impl From<reqwest::Error> for AIError {
    fn from(error: reqwest::Error) -> Self {
        AIError::HttpError(error)
    }
}

impl From<serde_json::Error> for AIError {
    fn from(error: serde_json::Error) -> Self {
        AIError::SerdeError(error)
    }
}

// Common chat message structure used across all providers
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

// Generic response structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIResponse {
    pub content: String,
    pub reasoning: Option<String>,
}

// OpenAI specific structures
mod openai {
    use serde::{Deserialize, Serialize};
    
    #[derive(Debug, Serialize)]
    pub struct ChatCompletionRequest {
        pub model: String,
        pub messages: Vec<super::ChatMessage>,
        pub stream: bool,
    }
    
    #[derive(Debug, Deserialize)]
    pub struct ChatCompletionResponse {
        #[allow(dead_code)]
        pub id: String,
        pub choices: Vec<Choice>,
    }
    
    #[derive(Debug, Deserialize)]
    pub struct Choice {
        pub message: super::ChatMessage,
    }
    
    #[derive(Debug, Deserialize)]
    #[allow(dead_code)]
    pub struct StreamResponse {
        pub choices: Vec<StreamChoice>,
    }

    #[derive(Debug, Deserialize)]
    #[allow(dead_code)]
    pub struct StreamChoice {
        pub delta: StreamDelta,
    }

    #[derive(Debug, Deserialize)]
    #[allow(dead_code)]
    pub struct StreamDelta {
        pub content: Option<String>,
    }
    
    #[derive(Debug, Deserialize)]
    pub struct ModelListResponse {
        pub data: Vec<Model>,
    }
    
    #[derive(Debug, Deserialize)]
    pub struct Model {
        pub id: String,
    }
}

// Gemini specific structures
mod gemini {
    use serde::{Deserialize, Serialize};
    
    #[derive(Debug, Serialize)]
    pub struct ChatRequest {
        pub contents: Vec<Content>,
    }
    
    #[derive(Debug, Serialize, Deserialize)]
    pub struct Content {
        pub role: String,
        pub parts: Vec<Part>,
    }
    
    #[derive(Debug, Serialize, Deserialize)]
    pub struct Part {
        pub text: String,
    }
    
    #[derive(Debug, Deserialize)]
    pub struct ChatResponse {
        pub candidates: Vec<Candidate>,
    }
    
    #[derive(Debug, Deserialize)]
    pub struct Candidate {
        pub content: Content,
    }
}

// Main API client
#[derive(Clone, Debug)]
pub struct AIClient {
    http_client: Client,
}

impl AIClient {
    pub fn new() -> Self {
        AIClient {
            http_client: Client::new(),
        }
    }
    
    // Send a chat request to OpenAI
    pub async fn openai_chat(
        &self, 
        api_url: &str, 
        api_key: &str, 
        model: &str, 
        messages: Vec<ChatMessage>
    ) -> Result<AIResponse, AIError> {
        // Construct the request
        let request = openai::ChatCompletionRequest {
            model: model.to_string(),
            messages,
            stream: false,
        };
        
        // Send the request
        let response = self.http_client
            .post(format!("{}/v1/chat/completions", api_url))
            .header("Authorization", format!("Bearer {}", api_key))
            .json(&request)
            .send()
            .await?;
            
        // Check for errors
        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(AIError::APIError(error_text));
        }
        
        // Parse the response
        let completion: openai::ChatCompletionResponse = response.json().await?;
        
        if let Some(choice) = completion.choices.first() {
            Ok(AIResponse {
                content: choice.message.content.clone(),
                reasoning: None,
            })
        } else {
            Err(AIError::APIError("No response generated".to_string()))
        }
    }
    
    // Fetch models from OpenAI
    pub async fn fetch_openai_models(
        &self,
        api_url: &str,
        api_key: &str
    ) -> Result<Vec<String>, AIError> {
        // Send the request
        let response = self.http_client
            .get(format!("{}/v1/models", api_url))
            .header("Authorization", format!("Bearer {}", api_key))
            .send()
            .await?;
            
        // Check for errors
        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(AIError::APIError(error_text));
        }
        
        // Parse the response
        let model_list: openai::ModelListResponse = response.json().await?;
        
        // Extract model IDs
        let model_ids = model_list.data.into_iter()
            .map(|model| model.id)
            .collect();
            
        Ok(model_ids)
    }
    
    // Send a chat request to Gemini
    pub async fn gemini_chat(
        &self,
        api_url: &str,
        api_key: &str,
        model: &str,
        messages: Vec<ChatMessage>
    ) -> Result<AIResponse, AIError> {
        // Convert messages to Gemini format
        let mut contents = Vec::new();
        for message in messages {
            let role = match message.role.as_str() {
                "user" => "user",
                "assistant" => "model",
                _ => continue, // Skip system messages for now
            };

            contents.push(gemini::Content {
                role: role.to_string(),
                parts: vec![gemini::Part { text: message.content }],
            });
        }

        // Construct the request
        let request = gemini::ChatRequest {
            contents,
        };

        // Send the request
        let response = self.http_client
            .post(format!("{}/v1beta/models/{}/generateContent?key={}", api_url, model, api_key))
            .json(&request)
            .send()
            .await?;

        // Check for errors
        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(AIError::APIError(error_text));
        }

        // Parse the response
        let gemini_response: gemini::ChatResponse = response.json().await?;

        if let Some(candidate) = gemini_response.candidates.first() {
            if let Some(part) = candidate.content.parts.first() {
                Ok(AIResponse {
                    content: part.text.clone(),
                    reasoning: None,
                })
            } else {
                Err(AIError::APIError("No content parts in response".to_string()))
            }
        } else {
            Err(AIError::APIError("No candidates in response".to_string()))
        }
    }

    // Fetch models from Gemini (placeholder for future implementation)
    #[allow(dead_code)]
    pub async fn fetch_gemini_models(
        &self,
        _api_url: &str,
        _api_key: &str
    ) -> Result<Vec<String>, AIError> {
        // TODO: Implement actual Gemini models API call
        // For now, return common Gemini models
        Ok(vec![
            "gemini-1.5-pro".to_string(),
            "gemini-1.5-flash".to_string(),
            "gemini-1.0-pro".to_string(),
        ])
    }
} 