use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::Mutex;
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use std::path::PathBuf;
use std::fs;
use serde::{Serialize, Deserialize};
use once_cell::sync::Lazy;

use crate::hooks::keyboard::{install_keyboard_hook, uninstall_keyboard_hook, IS_KEYBOARD_LOCKED};
use crate::hooks::mouse::{install_mouse_hook, uninstall_mouse_hook, IS_MOUSE_LOCKED};
use crate::enforcer::process::{start_process_monitor, stop_process_monitor, update_process_lists};
use crate::enforcer::overlay::{spawn_fullscreen_overlay, close_fullscreen_overlay};
use crate::enforcer::restrictions::{set_task_manager_disabled, set_cmd_disabled};
use crate::ipc::protocol::LockMode;

pub static IS_ACTIVE: AtomicBool = AtomicBool::new(false);
pub static SECONDS_REMAINING: AtomicU32 = AtomicU32::new(0);

static ACTIVE_MODE: Lazy<Mutex<Option<LockMode>>> = Lazy::new(|| Mutex::new(None));

#[derive(Serialize, Deserialize)]
struct SessionState {
    is_locked: bool,
    end_time_unix: u64,
    mode: String,
}

fn get_state_file_path() -> PathBuf {
    let mut path = PathBuf::from(std::env::var("PROGRAMDATA").unwrap_or_else(|_| "C:\\ProgramData".to_string()));
    path.push("Declutter");
    let _ = fs::create_dir_all(&path);
    path.push("lock_state.json");
    path
}

fn save_state(duration_seconds: u32, mode: &LockMode) {
    if let Ok(now) = SystemTime::now().duration_since(UNIX_EPOCH) {
        let end_time = now.as_secs() + duration_seconds as u64;
        let state = SessionState {
            is_locked: true,
            end_time_unix: end_time,
            mode: format!("{:?}", mode),
        };
        if let Ok(json) = serde_json::to_string(&state) {
            let _ = fs::write(get_state_file_path(), json);
        }
    }
}

fn clear_state() {
    let _ = fs::remove_file(get_state_file_path());
}

pub fn check_and_recover_state() {
    if let Ok(json) = fs::read_to_string(get_state_file_path()) {
        if let Ok(state) = serde_json::from_str::<SessionState>(&json) {
            let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
            if state.is_locked && now < state.end_time_unix {
                // Resume restrictions if they crashed
                println!("Recovered active lock. Will expire in {} seconds.", state.end_time_unix - now);
                let _ = set_task_manager_disabled(true);
                let _ = set_cmd_disabled(true);
                
                let remaining = state.end_time_unix - now;
                thread::spawn(move || {
                    thread::sleep(Duration::from_secs(remaining));
                    clear_state();
                    let _ = set_task_manager_disabled(false);
                    let _ = set_cmd_disabled(false);
                });
            } else {
                // Time has passed, clear restrictions
                println!("Recovered lock has expired. Clearing restrictions.");
                clear_state();
                let _ = set_task_manager_disabled(false);
                let _ = set_cmd_disabled(false);
            }
        }
    } else {
        // No state file, ensure restrictions are off just in case
        let _ = set_task_manager_disabled(false);
        let _ = set_cmd_disabled(false);
    }
}

pub fn start_session(
    duration_minutes: u32,
    lock_mode: LockMode,
    blocklist: Vec<String>,
    whitelist: Vec<String>,
) -> Result<(), String> {
    if IS_ACTIVE.load(Ordering::SeqCst) {
        return Err("A focus session is already active!".to_string());
    }

    IS_ACTIVE.store(true, Ordering::SeqCst);
    SECONDS_REMAINING.store(duration_minutes * 60, Ordering::SeqCst);
    
    save_state(duration_minutes * 60, &lock_mode);

    {
        if let Ok(mut mode_guard) = ACTIVE_MODE.lock() {
            *mode_guard = Some(lock_mode.clone());
        }
    }

    // 1. Configure and update process blocking rules
    update_process_lists(blocklist, whitelist);

    // 2. Engage lock levels depending on selected intensity
    match lock_mode {
        LockMode::Soft => {}
        LockMode::App => {
            start_process_monitor();
        }
        LockMode::View => {
            IS_KEYBOARD_LOCKED.store(true, Ordering::SeqCst);
            let _ = install_keyboard_hook();
            start_process_monitor();
        }
        LockMode::Full => {
            IS_KEYBOARD_LOCKED.store(true, Ordering::SeqCst);
            IS_MOUSE_LOCKED.store(true, Ordering::SeqCst);
            
            let _ = install_keyboard_hook();
            let _ = install_mouse_hook();
            let _ = spawn_fullscreen_overlay();
            let _ = set_task_manager_disabled(true);
            let _ = set_cmd_disabled(true);
            
            start_process_monitor();
        }
    }

    // 3. Start background countdown thread
    thread::spawn(|| {
        while IS_ACTIVE.load(Ordering::SeqCst) {
            let rem = SECONDS_REMAINING.load(Ordering::SeqCst);
            if rem == 0 {
                let _ = end_session();
                break;
            }
            SECONDS_REMAINING.store(rem - 1, Ordering::SeqCst);
            thread::sleep(Duration::from_secs(1));
        }
    });

    Ok(())
}

pub fn end_session() -> Result<(), String> {
    if !IS_ACTIVE.load(Ordering::SeqCst) {
        return Ok(());
    }

    IS_ACTIVE.store(false, Ordering::SeqCst);
    IS_KEYBOARD_LOCKED.store(false, Ordering::SeqCst);
    IS_MOUSE_LOCKED.store(false, Ordering::SeqCst);
    SECONDS_REMAINING.store(0, Ordering::SeqCst);
    
    clear_state();

    {
        if let Ok(mut mode_guard) = ACTIVE_MODE.lock() {
            *mode_guard = None;
        }
    }

    uninstall_keyboard_hook();
    uninstall_mouse_hook();
    close_fullscreen_overlay();
    stop_process_monitor();

    let _ = set_task_manager_disabled(false);
    let _ = set_cmd_disabled(false);

    Ok(())
}
