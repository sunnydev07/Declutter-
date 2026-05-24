mod hooks;
mod enforcer;
mod ipc;
mod session;

use std::io::{self, Write};
use std::sync::atomic::Ordering;
use crate::session::{start_session, end_session, IS_ACTIVE, SECONDS_REMAINING};
use crate::ipc::protocol::LockMode;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("=== Declutter Background Locking Service ===");
    println!("Awaiting commands via named pipes or local console...");

    // Install Ctrl+C signal handler to restore system safely on exit
    ctrlc::set_handler(move || {
        println!("\nTermination signal received! Safety clean up engaged...");
        let _ = end_session();
        std::process::exit(0);
    })?;

    // Basic interactive debug loop for manual testing
    // In production, this service runs headless and receives Named Pipe commands from Tauri GUI
    tokio::spawn(async {
        let stdin = io::stdin();
        let mut input = String::new();

        loop {
            input.clear();
            if IS_ACTIVE.load(Ordering::SeqCst) {
                let rem = SECONDS_REMAINING.load(Ordering::SeqCst);
                print!("\r[LOCKED] Remaining Time: {}s | Enter 'unlock' to force-stop: ", rem);
                let _ = io::stdout().flush();
            } else {
                print!("DeclutterService> ");
                let _ = io::stdout().flush();
            }

            if stdin.read_line(&mut input).is_ok() {
                let trimmed = input.trim();
                if trimmed == "unlock" || trimmed == "stop" {
                    let _ = end_session();
                    println!("\nSession terminated safely. Controls unlocked.");
                } else if trimmed.starts_with("lock ") {
                    // Syntax: lock <minutes> <mode: soft|app|view|full>
                    let parts: Vec<&str> = trimmed.split_whitespace().collect();
                    if parts.len() >= 3 {
                        let minutes = parts[1].parse::<u32>().unwrap_or(1);
                        let mode = match parts[2] {
                            "app" => LockMode::App,
                            "view" => LockMode::View,
                            "full" => LockMode::Full,
                            _ => LockMode::Soft,
                        };
                        println!("\nStarting session for {} minutes in {:?} mode...", minutes, mode);
                        
                        let blocklist = vec!["steam.exe".to_string(), "discord.exe".to_string()];
                        let whitelist = vec![];
                        
                        if let Err(e) = start_session(minutes, mode, blocklist, whitelist) {
                            println!("Error starting lock session: {}", e);
                        }
                    } else {
                        println!("Usage: lock <minutes> <soft|app|view|full>");
                    }
                } else if trimmed == "exit" {
                    let _ = end_session();
                    std::process::exit(0);
                } else if !trimmed.is_empty() {
                    println!("Unknown Command. Available commands: lock, stop, unlock, exit");
                }
            }
        }
    });

    // Keep the tokio execution runtime alive
    loop {
        tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
    }
}
