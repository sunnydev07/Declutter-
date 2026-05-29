use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;
use once_cell::sync::Lazy;
use windows::Win32::Foundation::CloseHandle;
use windows::Win32::System::Diagnostics::ToolHelp::{
    CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W, TH32CS_SNAPPROCESS,
};
use windows::Win32::System::Threading::{
    OpenProcess, TerminateProcess, PROCESS_TERMINATE,
};

pub static IS_MONITOR_ACTIVE: AtomicBool = AtomicBool::new(false);

static BLOCKLIST: Lazy<Mutex<Vec<String>>> = Lazy::new(|| Mutex::new(Vec::new()));
static WHITELIST: Lazy<Mutex<Vec<String>>> = Lazy::new(|| Mutex::new(Vec::new()));
static PROCESS_MODE: Lazy<Mutex<ProcessEnforcementMode>> =
    Lazy::new(|| Mutex::new(ProcessEnforcementMode::Blocklist));

#[derive(Clone, Copy)]
pub enum ProcessEnforcementMode {
    Blocklist,
    Allowlist,
    FullLock,
}

pub fn update_process_lists(
    blocklist: Vec<String>,
    whitelist: Vec<String>,
    mode: ProcessEnforcementMode,
) {
    if let Ok(mut bl) = BLOCKLIST.lock() {
        *bl = blocklist.iter().map(|s| s.to_lowercase()).collect();
    }
    if let Ok(mut wl) = WHITELIST.lock() {
        *wl = whitelist.iter().map(|s| s.to_lowercase()).collect();
    }
    if let Ok(mut mode_guard) = PROCESS_MODE.lock() {
        *mode_guard = mode;
    }
}

// Converts Windows wide character string to a Rust String
fn wide_char_to_string(wide: &[u16]) -> String {
    let len = wide.iter().take_while(|&&c| c != 0).count();
    String::from_utf16_lossy(&wide[..len])
}

fn is_protected_process(process_name: &str) -> bool {
    const PROTECTED_PROCESSES: &[&str] = &[
        "system",
        "registry",
        "smss.exe",
        "csrss.exe",
        "wininit.exe",
        "winlogon.exe",
        "services.exe",
        "lsass.exe",
        "svchost.exe",
        "fontdrvhost.exe",
        "spoolsv.exe",
        "taskhostw.exe",
        "runtimebroker.exe",
        "searchhost.exe",
        "shellexperiencehost.exe",
        "startmenuexperiencehost.exe",
        "sihost.exe",
        "ctfmon.exe",
        "conhost.exe",
        "applicationframehost.exe",
        "textinputhost.exe",
        "systemsettings.exe",
        "securityhealthservice.exe",
        "securityhealthsystray.exe",
        "wmiprvse.exe",
        "wudfhost.exe",
        "audiodg.exe",
        "dllhost.exe",
        "msmpeng.exe",
        "nisrv.exe",
        "tiworker.exe",
        "trustedinstaller.exe",
        "explorer.exe",
        "declutter.exe",
        "tauri-app.exe",
        "declutter-service.exe",
        "msedgewebview2.exe",
    ];

    PROTECTED_PROCESSES.contains(&process_name)
}

// Scans and terminates blocked processes
fn enforce_processes() {
    unsafe {
        let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
        if snapshot.is_err() {
            return;
        }
        let snapshot_handle = snapshot.unwrap();

        let mut entry = PROCESSENTRY32W::default();
        entry.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as u32;

        if Process32FirstW(snapshot_handle, &mut entry).is_ok() {
            loop {
                let process_name = wide_char_to_string(&entry.szExeFile).to_lowercase();

                let should_kill = {
                    if process_name == "taskmgr.exe" {
                        true
                    } else {
                        let mode = PROCESS_MODE
                            .lock()
                            .map(|mode| *mode)
                            .unwrap_or(ProcessEnforcementMode::Blocklist);

                        match mode {
                            ProcessEnforcementMode::FullLock => !is_protected_process(&process_name),
                            ProcessEnforcementMode::Blocklist => BLOCKLIST
                                .lock()
                                .map(|bl| bl.contains(&process_name))
                                .unwrap_or(false),
                            ProcessEnforcementMode::Allowlist => {
                                if BLOCKLIST
                                    .lock()
                                    .map(|bl| bl.contains(&process_name))
                                    .unwrap_or(false)
                                {
                                    true
                                } else {
                                    WHITELIST
                                        .lock()
                                        .map(|wl| {
                                            !wl.is_empty()
                                                && !wl.contains(&process_name)
                                                && !is_protected_process(&process_name)
                                        })
                                        .unwrap_or(false)
                                }
                            }
                        }
                    }
                };

                if should_kill {
                    if let Ok(process_handle) = OpenProcess(
                        PROCESS_TERMINATE,
                        false,
                        entry.th32ProcessID,
                    ) {
                        let _ = TerminateProcess(process_handle, 1);
                        let _ = CloseHandle(process_handle);
                    }
                }

                if !Process32NextW(snapshot_handle, &mut entry).is_ok() {
                    break;
                }
            }
        }
        let _ = CloseHandle(snapshot_handle);
    }
}

pub fn start_process_monitor() {
    if IS_MONITOR_ACTIVE.load(Ordering::SeqCst) {
        return;
    }

    IS_MONITOR_ACTIVE.store(true, Ordering::SeqCst);
    thread::spawn(|| {
        while IS_MONITOR_ACTIVE.load(Ordering::SeqCst) {
            enforce_processes();
            thread::sleep(Duration::from_millis(250)); // High frequency scan
        }
    });
}

pub fn stop_process_monitor() {
    IS_MONITOR_ACTIVE.store(false, Ordering::SeqCst);
}
