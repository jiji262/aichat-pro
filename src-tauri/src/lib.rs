// This file is needed for the project to compile and related to the
// way Tauri integrates with Android and iOS. For desktop-only applications,
// the functionality is handled in main.rs.

// Re-export the app from main
pub mod ai;
pub mod db;
pub mod credentials;

// Bindings for mobile
#[cfg(any(target_os = "android", target_os = "ios"))]
pub fn run() {
    use tauri::App;

    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
