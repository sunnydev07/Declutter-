// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use serde::{Deserialize, Serialize};
use std::io::{Read, Write};

// ── IPC protocol types (mirror of src-service/src/ipc/protocol.rs) ────────

#[derive(Debug, Clone, Serialize, Deserialize)]
enum LockMode {
    Soft,
    App,
    View,
    Full,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct StartLockRequest {
    duration_minutes: u32,
    lock_mode: LockMode,
    blocklist: Vec<String>,
    whitelist: Vec<String>,
    emergency_method: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
enum IpcMessage {
    StartLock(StartLockRequest),
    StopLock,
    GetStatus,
    Status(serde_json::Value), // We only need to detect Ack vs Error on this side
    Ack,
    Error(String),
}

const PIPE_NAME: &str = r"\\.\pipe\declutter_ipc";

/// Send a length-prefixed JSON message to the named pipe and read the response.
///
/// Uses synchronous blocking I/O (std::fs) wrapped in `spawn_blocking` so the
/// Tauri async runtime is not stalled. This avoids needing the `tokio` named
/// pipe client (which requires `SecurityAttributes` on Windows services).
fn send_ipc_message(msg: &IpcMessage) -> Result<IpcMessage, String> {
    use std::fs::OpenOptions;

    // Open the named pipe as a regular file (client side).
    let mut pipe = OpenOptions::new()
        .read(true)
        .write(true)
        .open(PIPE_NAME)
        .map_err(|e| format!("Cannot connect to Declutter service: {e}. Is the service running?"))?;

    // Serialize the outgoing message.
    let payload = serde_json::to_vec(msg).map_err(|e| format!("Serialization error: {e}"))?;
    let len_bytes = (payload.len() as u32).to_le_bytes();

    // Write length prefix + payload.
    pipe.write_all(&len_bytes)
        .map_err(|e| format!("Pipe write error: {e}"))?;
    pipe.write_all(&payload)
        .map_err(|e| format!("Pipe write error: {e}"))?;
    pipe.flush()
        .map_err(|e| format!("Pipe flush error: {e}"))?;

    // Read the response length prefix.
    let mut resp_len_buf = [0u8; 4];
    pipe.read_exact(&mut resp_len_buf)
        .map_err(|e| format!("Pipe read error (length): {e}"))?;
    let resp_len = u32::from_le_bytes(resp_len_buf) as usize;

    if resp_len > 1_048_576 {
        return Err("Service response too large".to_string());
    }

    // Read the response payload.
    let mut resp_buf = vec![0u8; resp_len];
    pipe.read_exact(&mut resp_buf)
        .map_err(|e| format!("Pipe read error (payload): {e}"))?;

    serde_json::from_slice::<IpcMessage>(&resp_buf)
        .map_err(|e| format!("Failed to parse service response: {e}"))
}

/// Convert a frontend lock mode string ("soft", "app", "view", "full") to the enum.
fn parse_lock_mode(s: &str) -> Result<LockMode, String> {
    match s.to_lowercase().as_str() {
        "soft" => Ok(LockMode::Soft),
        "app" => Ok(LockMode::App),
        "view" => Ok(LockMode::View),
        "full" => Ok(LockMode::Full),
        other => Err(format!("Unknown lock mode: {other}")),
    }
}

// ── Tauri commands ────────────────────────────────────────────────────────

#[tauri::command]
async fn start_lock_session(
    duration_minutes: u32,
    lock_mode: String,
    blocklist: Vec<String>,
    whitelist: Vec<String>,
    emergency_method: String,
) -> Result<(), String> {
    let mode = parse_lock_mode(&lock_mode)?;

    let msg = IpcMessage::StartLock(StartLockRequest {
        duration_minutes,
        lock_mode: mode,
        blocklist,
        whitelist,
        emergency_method,
    });

    // Run blocking pipe I/O on Tokio's blocking pool.
    let response = tokio::task::spawn_blocking(move || send_ipc_message(&msg))
        .await
        .map_err(|e| format!("Task join error: {e}"))??;

    match response {
        IpcMessage::Ack => Ok(()),
        IpcMessage::Error(e) => Err(e),
        other => Err(format!("Unexpected response from service: {:?}", other)),
    }
}

#[tauri::command]
async fn stop_lock_session() -> Result<(), String> {
    let msg = IpcMessage::StopLock;

    let response = tokio::task::spawn_blocking(move || send_ipc_message(&msg))
        .await
        .map_err(|e| format!("Task join error: {e}"))??;

    match response {
        IpcMessage::Ack => Ok(()),
        IpcMessage::Error(e) => Err(e),
        other => Err(format!("Unexpected response from service: {:?}", other)),
    }
}

#[tauri::command]
async fn get_lock_status() -> Result<String, String> {
    let msg = IpcMessage::GetStatus;

    let response = tokio::task::spawn_blocking(move || send_ipc_message(&msg))
        .await
        .map_err(|e| format!("Task join error: {e}"))??;

    // Return the full JSON so the frontend can parse it.
    serde_json::to_string(&response).map_err(|e| format!("Serialization error: {e}"))
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .invoke_handler(tauri::generate_handler![
            greet,
            start_lock_session,
            stop_lock_session,
            get_lock_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
