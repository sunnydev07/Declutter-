use std::sync::atomic::{AtomicBool, Ordering};
use windows::Win32::Foundation::{LPARAM, LRESULT, WPARAM};
use windows::Win32::UI::WindowsAndMessaging::{
    CallNextHookEx, HHOOK, KBDLLHOOKSTRUCT, WH_KEYBOARD_LL,
};
use windows::Win32::UI::Input::KeyboardAndMouse::{
    VK_LWIN, VK_RWIN, VK_TAB, VK_ESCAPE, VK_F4, VK_MENU, VK_CONTROL
};

// Controls if keyboard input should be blocked
pub static IS_KEYBOARD_LOCKED: AtomicBool = AtomicBool::new(false);

// Global Hook Handle
static mut H_KEYBOARD_HOOK: Option<HHOOK> = None;

// Unsafe low-level hook callback procedure
pub unsafe extern "system" fn low_level_keyboard_proc(
    n_code: i32,
    w_param: WPARAM,
    l_param: LPARAM,
) -> LRESULT {
    // If hook code is less than 0, Windows documentation mandates calling CallNextHookEx immediately
    if n_code < 0 {
        return CallNextHookEx(None, n_code, w_param, l_param);
    }

    if IS_KEYBOARD_LOCKED.load(Ordering::SeqCst) {
        let kb_struct = *(l_param.0 as *const KBDLLHOOKSTRUCT);
        let vk_code = kb_struct.vkCode as u16;

        // Extract key modifiers
        let alt_pressed = (kb_struct.flags & 0x20) != 0; // Context flag checks if Alt is down
        let ctrl_pressed = (windows::Win32::UI::Input::KeyboardAndMouse::GetAsyncKeyState(VK_CONTROL.0 as i32) as u16 & 0x8000) != 0;

        // Block specific high-risk system key combinations
        
        // 1. Windows Logo Keys (Left and Right)
        if vk_code == VK_LWIN.0 || vk_code == VK_RWIN.0 {
            return LRESULT(1); // Consume key stroke immediately
        }

        // 2. Alt + Tab (Task Switching)
        if vk_code == VK_TAB.0 && alt_pressed {
            return LRESULT(1);
        }

        // 3. Alt + Escape
        if vk_code == VK_ESCAPE.0 && alt_pressed {
            return LRESULT(1);
        }

        // 4. Alt + F4 (App Termination)
        if vk_code == VK_F4.0 && alt_pressed {
            return LRESULT(1);
        }

        // 5. Ctrl + Escape (Start Menu)
        if vk_code == VK_ESCAPE.0 && ctrl_pressed {
            return LRESULT(1);
        }

        // Under Kiosk/Full lock, block all keyboard inputs except emergency trigger sequence (e.g. Scroll Lock tap)
        // For standard locks, we allow typing, only preventing OS exits.
    }

    // Default: pass key stroke to next application hook in the chain
    CallNextHookEx(None, n_code, w_param, l_param)
}

pub fn install_keyboard_hook() -> Result<(), String> {
    unsafe {
        if H_KEYBOARD_HOOK.is_some() {
            return Ok(());
        }

        let hook = windows::Win32::UI::WindowsAndMessaging::SetWindowsHookExW(
            WH_KEYBOARD_LL,
            Some(low_level_keyboard_proc),
            None,
            0,
        );

        match hook {
            Ok(h) => {
                H_KEYBOARD_HOOK = Some(h);
                Ok(())
            }
            Err(e) => Err(format!("Failed to install keyboard hook: {:?}", e)),
        }
    }
}

pub fn uninstall_keyboard_hook() {
    unsafe {
        if let Some(h) = H_KEYBOARD_HOOK {
            let _ = windows::Win32::UI::WindowsAndMessaging::UnhookWindowsHookEx(h);
            H_KEYBOARD_HOOK = None;
        }
    }
}
