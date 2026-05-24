use windows::Win32::System::Registry::{
    RegCreateKeyExW, RegSetValueExW, RegDeleteValueW, RegCloseKey,
    HKEY_CURRENT_USER, REG_DWORD, REG_OPTION_NON_VOLATILE, KEY_WRITE,
};
use windows::core::w;

// Safely sets registry value to disable/enable Task Manager
pub fn set_task_manager_disabled(disabled: bool) -> Result<(), String> {
    unsafe {
        let mut h_key = windows::Win32::System::Registry::HKEY::default();
        let sub_key = w!(r"Software\Microsoft\Windows\CurrentVersion\Policies\System");
        
        let result = RegCreateKeyExW(
            HKEY_CURRENT_USER,
            sub_key,
            0,
            None,
            REG_OPTION_NON_VOLATILE,
            KEY_WRITE,
            None,
            &mut h_key,
            None,
        );

        if result.is_ok() {
            if disabled {
                let value_data: u32 = 1;
                let set_result = RegSetValueExW(
                    h_key,
                    w!("DisableTaskMgr"),
                    0,
                    REG_DWORD,
                    Some(std::slice::from_raw_parts(
                        &value_data as *const u32 as *const u8,
                        std::mem::size_of::<u32>(),
                    )),
                );
                let _ = RegCloseKey(h_key);
                if set_result.is_err() {
                    return Err("Failed to write DisableTaskMgr registry value".to_string());
                }
            } else {
                let delete_result = RegDeleteValueW(h_key, w!("DisableTaskMgr"));
                let _ = RegCloseKey(h_key);
                // Ignored if it doesn't exist, which is fine
                if delete_result.is_err() && delete_result.0 != 2 { // 2 = ERROR_FILE_NOT_FOUND
                    return Err("Failed to delete DisableTaskMgr registry value".to_string());
                }
            }
            Ok(())
        } else {
            Err("Failed to open System Policies registry key".to_string())
        }
    }
}

// Disables or enables CMD/PowerShell access
pub fn set_cmd_disabled(disabled: bool) -> Result<(), String> {
    unsafe {
        let mut h_key = windows::Win32::System::Registry::HKEY::default();
        let sub_key = w!(r"Software\Policies\Microsoft\Windows\System");
        
        let result = RegCreateKeyExW(
            HKEY_CURRENT_USER,
            sub_key,
            0,
            None,
            REG_OPTION_NON_VOLATILE,
            KEY_WRITE,
            None,
            &mut h_key,
            None,
        );

        if result.is_ok() {
            if disabled {
                let value_data: u32 = 2; // 2 disables command prompt entirely (prevents batch runs)
                let set_result = RegSetValueExW(
                    h_key,
                    w!("DisableCMD"),
                    0,
                    REG_DWORD,
                    Some(std::slice::from_raw_parts(
                        &value_data as *const u32 as *const u8,
                        std::mem::size_of::<u32>(),
                    )),
                );
                let _ = RegCloseKey(h_key);
                if set_result.is_err() {
                    return Err("Failed to write DisableCMD registry value".to_string());
                }
            } else {
                let delete_result = RegDeleteValueW(h_key, w!("DisableCMD"));
                let _ = RegCloseKey(h_key);
                if delete_result.is_err() && delete_result.0 != 2 {
                    return Err("Failed to delete DisableCMD registry value".to_string());
                }
            }
            Ok(())
        } else {
            Err("Failed to open CMD Policies registry key".to_string())
        }
    }
}

const HOSTS_FILE_PATH: &str = r"C:\Windows\System32\drivers\etc\hosts";
const DECLUTTER_HOSTS_MARKER: &str = "# --- DECLUTTER BLOCKED SITES ---";

pub fn block_websites(domains: &[String]) -> Result<(), String> {
    if domains.is_empty() {
        return Ok(());
    }

    let mut current_content = std::fs::read_to_string(HOSTS_FILE_PATH).unwrap_or_default();
    
    // First, ensure we're clean
    if current_content.contains(DECLUTTER_HOSTS_MARKER) {
        let _ = unblock_websites();
        current_content = std::fs::read_to_string(HOSTS_FILE_PATH).unwrap_or_default();
    }

    let mut appended = format!("\n{}\n", DECLUTTER_HOSTS_MARKER);
    for domain in domains {
        appended.push_str(&format!("127.0.0.1 {}\n", domain));
        appended.push_str(&format!("127.0.0.1 www.{}\n", domain));
    }
    appended.push_str(&format!("{}\n", DECLUTTER_HOSTS_MARKER));

    current_content.push_str(&appended);

    std::fs::write(HOSTS_FILE_PATH, current_content)
        .map_err(|e| format!("Failed to write hosts file: {}", e))
}

pub fn unblock_websites() -> Result<(), String> {
    let current_content = std::fs::read_to_string(HOSTS_FILE_PATH).unwrap_or_default();
    
    if !current_content.contains(DECLUTTER_HOSTS_MARKER) {
        return Ok(());
    }

    let mut new_content = String::new();
    let mut in_block = false;

    for line in current_content.lines() {
        if line.trim() == DECLUTTER_HOSTS_MARKER {
            if in_block {
                in_block = false; // end of block
            } else {
                in_block = true; // start of block
            }
            continue;
        }

        if !in_block {
            new_content.push_str(line);
            new_content.push('\n');
        }
    }

    // Clean up trailing newlines
    let new_content = new_content.trim_end().to_string() + "\n";

    std::fs::write(HOSTS_FILE_PATH, new_content)
        .map_err(|e| format!("Failed to restore hosts file: {}", e))
}
