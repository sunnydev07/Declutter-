use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::mpsc;
use std::thread;
use windows::Win32::Foundation::{LPARAM, LRESULT, WPARAM};
use windows::Win32::System::Threading::GetCurrentThreadId;
use windows::Win32::UI::WindowsAndMessaging::{
    CallNextHookEx, DispatchMessageW, GetMessageW, MSG, PeekMessageW,
    PostThreadMessageW, SetWindowsHookExW, UnhookWindowsHookEx, PM_NOREMOVE,
    WH_MOUSE_LL, WM_MOUSEMOVE, WM_LBUTTONDOWN, WM_RBUTTONDOWN, WM_QUIT
};

// Controls if mouse input should be blocked
pub static IS_MOUSE_LOCKED: AtomicBool = AtomicBool::new(false);

// Global Hook Handle
// The hook handle lives on the pump thread; this tracks the thread so it can be stopped.
static IS_MOUSE_HOOK_RUNNING: AtomicBool = AtomicBool::new(false);
static MOUSE_HOOK_THREAD_ID: AtomicU32 = AtomicU32::new(0);

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
    if IS_MOUSE_HOOK_RUNNING.swap(true, Ordering::SeqCst) {
        return Ok(());
    }

    let (tx, rx) = mpsc::channel();

    thread::spawn(move || {
        unsafe {
            MOUSE_HOOK_THREAD_ID.store(GetCurrentThreadId(), Ordering::SeqCst);

            let hook = SetWindowsHookExW(
                WH_MOUSE_LL,
                Some(low_level_mouse_proc),
                None,
                0,
            );

            match hook {
                Ok(h) => {
                    let mut msg = MSG::default();
                    let _ = PeekMessageW(&mut msg, None, 0, 0, PM_NOREMOVE);
                    let _ = tx.send(Ok(()));

                    while GetMessageW(&mut msg, None, 0, 0).as_bool() {
                        if !IS_MOUSE_LOCKED.load(Ordering::SeqCst) {
                            break;
                        }
                        let _ = DispatchMessageW(&msg);
                    }

                    let _ = UnhookWindowsHookEx(h);
                }
                Err(e) => {
                    let _ = tx.send(Err(format!("Failed to install mouse hook: {:?}", e)));
                }
            }

            MOUSE_HOOK_THREAD_ID.store(0, Ordering::SeqCst);
            IS_MOUSE_HOOK_RUNNING.store(false, Ordering::SeqCst);
        }
    });

    match rx.recv() {
        Ok(result) => result,
        Err(e) => {
            IS_MOUSE_HOOK_RUNNING.store(false, Ordering::SeqCst);
            Err(format!("Failed to start mouse hook thread: {:?}", e))
        }
    }
}

pub fn uninstall_mouse_hook() {
    IS_MOUSE_LOCKED.store(false, Ordering::SeqCst);

    let thread_id = MOUSE_HOOK_THREAD_ID.load(Ordering::SeqCst);
    if thread_id != 0 {
        unsafe {
            let _ = PostThreadMessageW(thread_id, WM_QUIT, WPARAM(0), LPARAM(0));
        }
    }
}
