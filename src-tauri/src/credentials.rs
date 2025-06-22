use keyring::Entry;
use std::error::Error;
use std::fmt;

#[derive(Debug)]
pub enum CredentialError {
    KeyringError(keyring::Error),
    NoCredentialFound,
}

impl fmt::Display for CredentialError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            CredentialError::KeyringError(e) => write!(f, "Keyring error: {}", e),
            CredentialError::NoCredentialFound => write!(f, "No credential found"),
        }
    }
}

impl Error for CredentialError {}

impl From<keyring::Error> for CredentialError {
    fn from(error: keyring::Error) -> Self {
        CredentialError::KeyringError(error)
    }
}

// Helper function to create a keyring entry for an API key
fn create_entry(key_name: &str) -> Entry {
    Entry::new("com.aichatbox.app", key_name).unwrap()
}

// Store an API key securely
pub fn store_api_key(key_name: &str, api_key: &str) -> Result<(), CredentialError> {
    let entry = create_entry(key_name);
    entry.set_password(api_key)?;
    Ok(())
}

// Retrieve an API key
pub fn get_api_key(key_name: &str) -> Result<String, CredentialError> {
    let entry = create_entry(key_name);
    match entry.get_password() {
        Ok(password) => Ok(password),
        Err(_) => Err(CredentialError::NoCredentialFound),
    }
}

// Delete an API key
pub fn delete_api_key(key_name: &str) -> Result<(), CredentialError> {
    let entry = create_entry(key_name);
    // Try to delete the entry; ignore if it doesn't exist
    let _ = entry.delete_password();
    Ok(())
} 