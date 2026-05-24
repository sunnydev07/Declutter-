use std::sync::atomic::{AtomicBool, Ordering};
use windows::Win32::Foundation::{LPARAM, LRESULT, WPARAM};
use windows::Win32::UI::WindowsAndMessaging::{
    CallNextHookEx, HHOOK, WH_MOUSE_LL, MSLLHOOKSTRUCT, WM_MOUSEMOVE, WM_LBUTTONDOWN, WM_RBUTTONDOWN
};

// Controls if mouse input should be blocked
pub static IS_MOUSE_LOCKED: AtomicBool = AtomicBool::new(false);

// Global Hook Handle
static mut H_MOUSE_HOOK: Option<HHOOK> = None;

// Unsafe low-level hook callback procedure
pub unsafe extern "system" fn low_level_mouse_proc(
    n_code: i32,
    w_param: WPARAM,
    l_param: LPARAM,
) -> LRESULT {
    if n_code < 0 {
        return CallNextHookEx(None, n_code, w_param, l_param);
    }

    if IS_MOUSE_LOCKED.load(Ordering::SeqCst) {
        let msg = w_param.0 as u32;

        // Block mouse click events completely under Full Kiosk mode
        if msg == WM_LBUTTONDOWN || msg == WM_RBUTTONDOWN {
            return LRESULT(1); // Block clicks
        }

        // Optional: block movement, or restrict mouse to single monitor bounds
        if msg == WM_MOUSEMOVE {
            // We can consume movement to freeze mouse cursor if requested
            // return LRESULT(1);
        }
    }

    CallNextHookEx(None, n_code, w_param, l_param)
}

pub fn install_mouse_hook() -> Result<(), String> {
    unsafe {
        if H_MOUSE_HOOK.is_some() {
            return Ok(());
        }

        let hook = windows::Win32::UI::WindowsAndMessaging::SetWindowsHookExW(
            WH_MOUSE_LL,
            Some(low_level_mouse_proc),
            None,
            0,
        );

        match hook {
            Ok(h) => {
                H_MOUSE_HOOK = Some(h);
                Ok(())
            }
            Err(e) => Err(format!("Failed to install mouse hook: {:?}", e)),
        }
    }
}

pub fn uninstall_mouse_hook() {
    unsafe {
        if let Some(h) = H_MOUSE_HOOK {
            let _ = windows::Win32::UI::WindowsAndMessaging::UnhookWindowsHookEx(h);
            H_MOUSE_HOOK = None;
        }
    }
}
