use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;
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
    
    {
        if let Ok(mut mode_guard) = ACTIVE_MODE.lock() {
            *mode_guard = Some(lock_mode.clone());
        }
    }

    // 1. Configure and update process blocking rules
    update_process_lists(blocklist, whitelist);

    // 2. Engage lock levels depending on selected intensity
    match lock_mode {
        LockMode::Soft => {
            // Soft lock has no OS-level blocks, only counts distractions/stats
        }
        LockMode::App => {
            // Block listed processes
            start_process_monitor();
        }
        LockMode::View => {
            // Block keyboard input, let mouse move freely, block apps
            IS_KEYBOARD_LOCKED.store(true, Ordering::SeqCst);
            let _ = install_keyboard_hook();
            start_process_monitor();
        }
        LockMode::Full => {
            // Total Kiosk lockdown: keyboard hooks, mouse hooks, registry restrictions, process monitor, overlay
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

    // 1. Disable all atomic enforcements
    IS_ACTIVE.store(false, Ordering::SeqCst);
    IS_KEYBOARD_LOCKED.store(false, Ordering::SeqCst);
    IS_MOUSE_LOCKED.store(false, Ordering::SeqCst);
    SECONDS_REMAINING.store(0, Ordering::SeqCst);

    {
        if let Ok(mut mode_guard) = ACTIVE_MODE.lock() {
            *mode_guard = None;
        }
    }

    // 2. Clean up Win32 hooks and UI structures
    uninstall_keyboard_hook();
    uninstall_mouse_hook();
    close_fullscreen_overlay();
    stop_process_monitor();

    // 3. Undo registry policies
    let _ = set_task_manager_disabled(false);
    let _ = set_cmd_disabled(false);

    Ok(())
}
