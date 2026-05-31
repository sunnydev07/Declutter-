use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::thread;
use once_cell::sync::Lazy;
use windows::Win32::Foundation::{HWND, LPARAM, LRESULT, WPARAM};
use windows::Win32::Graphics::Gdi::HBRUSH;
use windows::Win32::UI::WindowsAndMessaging::{
    CreateWindowExW, DefWindowProcW, DestroyWindow, DispatchMessageW, GetMessageW,
    PostMessageW, PostQuitMessage, RegisterClassW, ShowWindow, HWND_TOPMOST,
    MSG, SW_SHOW, WM_CLOSE, WM_DESTROY, WNDCLASSW, WS_EX_TOPMOST,
    WS_POPUP, WS_VISIBLE, GetSystemMetrics, SM_CXVIRTUALSCREEN, SM_CYVIRTUALSCREEN,
    SM_XVIRTUALSCREEN, SM_YVIRTUALSCREEN, CS_HREDRAW, CS_VREDRAW,
};
use windows::core::w;

pub static IS_OVERLAY_ACTIVE: AtomicBool = AtomicBool::new(false);
static H_OVERLAY_WINDOW: Lazy<Mutex<Option<HWND>>> = Lazy::new(|| Mutex::new(None));

// Window Message Callback Proc
unsafe extern "system" fn overlay_window_proc(
    hwnd: HWND,
    msg: u32,
    w_param: WPARAM,
    l_param: LPARAM,
) -> LRESULT {
    match msg {
        WM_CLOSE => {
            let _ = DestroyWindow(hwnd);
            LRESULT(0)
        }
        WM_DESTROY => {
            PostQuitMessage(0);
            LRESULT(0)
        }
        _ => DefWindowProcW(hwnd, msg, w_param, l_param),
    }
}

pub fn spawn_fullscreen_overlay() -> Result<(), String> {
    if IS_OVERLAY_ACTIVE.load(Ordering::SeqCst) {
        return Ok(());
    }

    IS_OVERLAY_ACTIVE.store(true, Ordering::SeqCst);
    
    thread::spawn(|| {
        unsafe {
            let instance = windows::Win32::System::LibraryLoader::GetModuleHandleW(None).unwrap();
            let class_name = w!("DeclutterOverlayClass");

            let wnd_class = WNDCLASSW {
                style: CS_HREDRAW | CS_VREDRAW,
                lpfnWndProc: Some(overlay_window_proc),
                hInstance: instance.into(),
                lpszClassName: class_name,
                // Dark background brush
                hbrBackground: HBRUSH(5), // Color Window (usually white, but we'll cover it or style it)
                ..Default::default()
            };

            let class_atom = RegisterClassW(&wnd_class);
            if class_atom == 0 {
                // Ignore register errors if class is already registered
            }

            // Get total screen bounds across all monitors
            let x = GetSystemMetrics(SM_XVIRTUALSCREEN);
            let y = GetSystemMetrics(SM_YVIRTUALSCREEN);
            let width = GetSystemMetrics(SM_CXVIRTUALSCREEN);
            let height = GetSystemMetrics(SM_CYVIRTUALSCREEN);

            // Create topmost, borderless, popup window
            let hwnd = CreateWindowExW(
                WS_EX_TOPMOST,
                class_name,
                w!("Declutter Focus Lock"),
                WS_POPUP | WS_VISIBLE,
                x,
                y,
                width,
                height,
                None,
                None,
                instance,
                None,
            );

            if hwnd.0 != 0 {
                {
                    if let Ok(mut handle_guard) = H_OVERLAY_WINDOW.lock() {
                        *handle_guard = Some(hwnd);
                    }
                }

                // Force Topmost status explicitly
                let _ = windows::Win32::UI::WindowsAndMessaging::SetWindowPos(
                    hwnd,
                    HWND_TOPMOST,
                    x,
                    y,
                    width,
                    height,
                    windows::Win32::UI::WindowsAndMessaging::SET_WINDOW_POS_FLAGS(0),
                );

                let _ = ShowWindow(hwnd, SW_SHOW);

                // Standard message loop to keep window responsive
                let mut msg = MSG::default();
                while GetMessageW(&mut msg, None, 0, 0).as_bool() {
                    let _ = DispatchMessageW(&msg);
                    if !IS_OVERLAY_ACTIVE.load(Ordering::SeqCst) {
                        break;
                    }
                }
            } else {
                IS_OVERLAY_ACTIVE.store(false, Ordering::SeqCst);
                println!("Failed to create overlay window.");
            }
        }
    });

    Ok(())
}

pub fn close_fullscreen_overlay() {
    IS_OVERLAY_ACTIVE.store(false, Ordering::SeqCst);
    if let Ok(mut handle_guard) = H_OVERLAY_WINDOW.lock() {
        if let Some(hwnd) = *handle_guard {
            unsafe {
                let _ = PostMessageW(hwnd, WM_CLOSE, WPARAM(0), LPARAM(0));
            }
            *handle_guard = None;
        }
    }
}
