// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use serde::{Deserialize, Serialize};
use std::io::{Read, Write};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{TrayIcon, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, Wry,
};
use tauri_plugin_notification::NotificationExt;

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
    website_blocklist: Vec<String>,
    #[serde(default)]
    is_sword_mode: bool,
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

struct TrayState {
    status_item: MenuItem<Wry>,
    pause_item: MenuItem<Wry>,
    resume_item: MenuItem<Wry>,
    quit_session_item: MenuItem<Wry>,
    exit_item: MenuItem<Wry>,
    tray_icon: TrayIcon<Wry>,
    is_strict_lock_active: AtomicBool,
}

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
    website_blocklist: Vec<String>,
    #[allow(non_snake_case)]
    is_sword_mode: Option<bool>,
) -> Result<(), String> {
    let mode = parse_lock_mode(&lock_mode)?;

    let msg = IpcMessage::StartLock(StartLockRequest {
        duration_minutes,
        lock_mode: mode,
        blocklist,
        whitelist,
        emergency_method,
        website_blocklist,
        is_sword_mode: is_sword_mode.unwrap_or(false),
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

#[tauri::command]
fn get_running_processes() -> Vec<String> {
    use sysinfo::System;

    let mut sys = System::new_all();
    sys.refresh_all();

    let critical_processes = [
        "system",
        "registry",
        "smss.exe",
        "csrss.exe",
        "wininit.exe",
        "services.exe",
        "lsass.exe",
        "svchost.exe",
        "fontdrvhost.exe",
        "spoolsv.exe",
        "taskhostw.exe",
        "runtimebroker.exe",
        "searchhost.exe",
        "shellexperiencehost.exe",
        "ctfmon.exe",
        "conhost.exe",
        "applicationframehost.exe",
        "winlogon.exe",
        "dwm.exe",
    ];

    let mut processes: Vec<String> = sys
        .processes()
        .values()
        .filter_map(|proc| {
            let name = proc.name();
            if name.is_empty() {
                return None;
            }
            
            let mut name_str = name.to_string();
            // standardise Windows executables
            if !name_str.to_lowercase().ends_with(".exe") && name_str.to_lowercase() != "system" && name_str.to_lowercase() != "registry" {
                name_str.push_str(".exe");
            }
            
            let lower_name = name_str.to_lowercase();
            if critical_processes.iter().any(|&crit| crit == lower_name) {
                None
            } else {
                Some(name_str)
            }
        })
        .collect();

    processes.sort_by(|a, b| a.to_lowercase().cmp(&b.to_lowercase()));
    processes.dedup_by(|a, b| a.to_lowercase() == b.to_lowercase());
    processes
}

#[tauri::command]
async fn update_tray_status(
    state: tauri::State<'_, TrayState>,
    status_text: String,
    can_pause: bool,
    can_resume: bool,
    can_quit_session: bool,
    can_exit: bool,
) -> Result<(), String> {
    state
        .status_item
        .set_text(&status_text)
        .map_err(|e| e.to_string())?;
    state
        .pause_item
        .set_enabled(can_pause)
        .map_err(|e| e.to_string())?;
    state
        .resume_item
        .set_enabled(can_resume)
        .map_err(|e| e.to_string())?;
    state
        .quit_session_item
        .set_enabled(can_quit_session)
        .map_err(|e| e.to_string())?;
    state
        .exit_item
        .set_enabled(can_exit)
        .map_err(|e| e.to_string())?;
    state
        .tray_icon
        .set_tooltip(Some(status_text))
        .map_err(|e| e.to_string())?;
    state
        .is_strict_lock_active
        .store(!can_exit, Ordering::SeqCst);

    Ok(())
}

#[tauri::command]
async fn emergency_system_repair() -> Result<(), String> {
    // 1. Try to stop any active lock session via the service IPC pipe (best-effort).
    let msg = IpcMessage::StopLock;
    let _ = tokio::task::spawn_blocking(move || send_ipc_message(&msg)).await;

    // 2. Perform direct registry cleanup using the winreg crate.
    // This is run outside the pipe server context so it works even if the service is dead.
    tokio::task::spawn_blocking(move || {
        use winreg::enums::*;
        use winreg::RegKey;

        let hkcu = RegKey::predef(HKEY_CURRENT_USER);

        // A. Repair Task Manager & Registry tools policies
        if let Ok((system_key, _)) = hkcu.create_subkey(r"Software\Microsoft\Windows\CurrentVersion\Policies\System") {
            let _ = system_key.set_value("DisableTaskMgr", &0u32);
            let _ = system_key.set_value("DisableRegistryTools", &0u32);
        }

        // B. Repair CMD/Shell policies
        if let Ok((cmd_key, _)) = hkcu.create_subkey(r"Software\Policies\Microsoft\Windows\System") {
            let _ = cmd_key.set_value("DisableCMD", &0u32);
        }

        // C. Clear the hosts file (best-effort)
        const HOSTS_FILE_PATH: &str = r"C:\Windows\System32\drivers\etc\hosts";
        const DECLUTTER_HOSTS_MARKER: &str = "# --- DECLUTTER BLOCKED SITES ---";

        if let Ok(current_content) = std::fs::read_to_string(HOSTS_FILE_PATH) {
            if current_content.contains(DECLUTTER_HOSTS_MARKER) {
                let mut new_content = String::new();
                let mut in_block = false;

                for line in current_content.lines() {
                    if line.trim() == DECLUTTER_HOSTS_MARKER {
                        in_block = !in_block;
                        continue;
                    }

                    if !in_block {
                        new_content.push_str(line);
                        new_content.push('\n');
                    }
                }

                let new_content = new_content.trim_end().to_string() + "\n";
                let _ = std::fs::write(HOSTS_FILE_PATH, new_content);
            }
        }

        Ok::<(), String>(())
    })
    .await
    .map_err(|e| format!("Join error: {e}"))?
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
        .setup(|app| {
            let handle = app.handle();

            let status_item = MenuItem::with_id(handle, "status", "Status: Idle", false, None::<&str>)?;
            let open_item = MenuItem::with_id(handle, "open", "Open Declutter", true, None::<&str>)?;
            let pause_item = MenuItem::with_id(handle, "pause", "Pause Session", false, None::<&str>)?;
            let resume_item = MenuItem::with_id(handle, "resume", "Resume Session", false, None::<&str>)?;
            let quit_session_item =
                MenuItem::with_id(handle, "quit_session", "Force Quit Session", false, None::<&str>)?;
            let exit_item = MenuItem::with_id(handle, "exit", "Exit App", true, None::<&str>)?;

            let tray_menu = Menu::with_items(
                handle,
                &[
                    &status_item,
                    &PredefinedMenuItem::separator(handle)?,
                    &open_item,
                    &pause_item,
                    &resume_item,
                    &quit_session_item,
                    &PredefinedMenuItem::separator(handle)?,
                    &exit_item,
                ],
            )?;

            let mut tray_builder = TrayIconBuilder::new()
                .menu(&tray_menu)
                .tooltip("Declutter: Idle")
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                    "pause" => {
                        let _ = app.emit("tray-pause", ());
                    }
                    "resume" => {
                        let _ = app.emit("tray-resume", ());
                    }
                    "quit_session" => {
                        let _ = app.emit("tray-quit-session", ());
                    }
                    "exit" => {
                        if app
                            .try_state::<TrayState>()
                            .map(|state| state.is_strict_lock_active.load(Ordering::SeqCst))
                            .unwrap_or(false)
                        {
                            let _ = app
                                .notification()
                                .builder()
                                .title("Declutter")
                                .body("Exit is disabled during View and Full lock sessions.")
                                .show();

                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                            }

                            return;
                        }

                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { .. } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                });

            if let Some(icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(icon.clone());
            }

            let tray_icon = tray_builder.build(app)?;

            app.manage(TrayState {
                status_item,
                pause_item,
                resume_item,
                quit_session_item,
                exit_item,
                tray_icon,
                is_strict_lock_active: AtomicBool::new(false),
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();

                let _ = window
                    .app_handle()
                    .notification()
                    .builder()
                    .title("Declutter")
                    .body("Declutter is minimized to the system tray and remains active.")
                    .show();
            }
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            get_running_processes,
            start_lock_session,
            stop_lock_session,
            get_lock_status,
            update_tray_status,
            emergency_system_repair
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
