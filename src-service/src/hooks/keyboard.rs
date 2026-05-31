use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::mpsc;
use std::thread;
use windows::Win32::Foundation::{LPARAM, LRESULT, WPARAM};
use windows::Win32::System::Threading::GetCurrentThreadId;
use windows::Win32::UI::WindowsAndMessaging::{
    CallNextHookEx, DispatchMessageW, GetMessageW, KBDLLHOOKSTRUCT, LLKHF_ALTDOWN,
    MSG, PeekMessageW, PostThreadMessageW, SetWindowsHookExW, UnhookWindowsHookEx,
    PM_NOREMOVE, WH_KEYBOARD_LL, WM_QUIT,
};
use windows::Win32::UI::Input::KeyboardAndMouse::{
    VK_LWIN, VK_RWIN, VK_TAB, VK_ESCAPE, VK_F4, VK_CONTROL
};

// Controls if keyboard input should be blocked
pub static IS_KEYBOARD_LOCKED: AtomicBool = AtomicBool::new(false);

// Global Hook Handle
// The hook handle lives on the pump thread; this tracks the thread so it can be stopped.
static IS_KEYBOARD_HOOK_RUNNING: AtomicBool = AtomicBool::new(false);
static KEYBOARD_HOOK_THREAD_ID: AtomicU32 = AtomicU32::new(0);

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
        let alt_pressed = (kb_struct.flags & LLKHF_ALTDOWN).0 != 0;
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
    if IS_KEYBOARD_HOOK_RUNNING.swap(true, Ordering::SeqCst) {
        return Ok(());
    }

    let (tx, rx) = mpsc::channel();

    thread::spawn(move || {
        unsafe {
            KEYBOARD_HOOK_THREAD_ID.store(GetCurrentThreadId(), Ordering::SeqCst);

            let hook = SetWindowsHookExW(
                WH_KEYBOARD_LL,
                Some(low_level_keyboard_proc),
                None,
                0,
            );

            match hook {
                Ok(h) => {
                    let mut msg = MSG::default();
                    let _ = PeekMessageW(&mut msg, None, 0, 0, PM_NOREMOVE);
                    let _ = tx.send(Ok(()));

                    while GetMessageW(&mut msg, None, 0, 0).as_bool() {
                        if !IS_KEYBOARD_LOCKED.load(Ordering::SeqCst) {
                            break;
                        }
                        let _ = DispatchMessageW(&msg);
                    }

                    let _ = UnhookWindowsHookEx(h);
                }
                Err(e) => {
                    let _ = tx.send(Err(format!("Failed to install keyboard hook: {:?}", e)));
                }
            }

            KEYBOARD_HOOK_THREAD_ID.store(0, Ordering::SeqCst);
            IS_KEYBOARD_HOOK_RUNNING.store(false, Ordering::SeqCst);
        }
    });

    match rx.recv() {
        Ok(result) => result,
        Err(e) => {
            IS_KEYBOARD_HOOK_RUNNING.store(false, Ordering::SeqCst);
            Err(format!("Failed to start keyboard hook thread: {:?}", e))
        }
    }
}

pub fn uninstall_keyboard_hook() {
    IS_KEYBOARD_LOCKED.store(false, Ordering::SeqCst);

    let thread_id = KEYBOARD_HOOK_THREAD_ID.load(Ordering::SeqCst);
    if thread_id != 0 {
        unsafe {
            let _ = PostThreadMessageW(thread_id, WM_QUIT, WPARAM(0), LPARAM(0));
        }
    }
}
