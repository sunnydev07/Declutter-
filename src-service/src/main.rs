mod hooks;
mod enforcer;
mod ipc;
mod session;

use std::env;
use std::ffi::OsString;
use std::time::Duration;
use windows_service::{
    define_windows_service,
    service::{
        ServiceControl, ServiceControlAccept, ServiceExitCode, ServiceState, ServiceStatus,
        ServiceType,
    },
    service_control_handler::{self, ServiceControlHandlerResult},
    service_dispatcher,
};

use crate::session::end_session;

const SERVICE_NAME: &str = "DeclutterService";

define_windows_service!(ffi_service_main, my_service_main);

fn my_service_main(arguments: Vec<OsString>) {
    if let Err(_e) = run_service(arguments) {
        // Log error in production
    }
}

fn run_service(_arguments: Vec<OsString>) -> windows_service::Result<()> {
    let status_handle = service_control_handler::register(SERVICE_NAME, move |control_event| {
        match control_event {
            ServiceControl::Stop => {
                let _ = end_session(true);
                std::process::exit(0);
            }
            ServiceControl::Interrogate => ServiceControlHandlerResult::NoError,
            _ => ServiceControlHandlerResult::NotImplemented,
        }
    })?;

    status_handle.set_service_status(ServiceStatus {
        service_type: ServiceType::OWN_PROCESS,
        current_state: ServiceState::Running,
        controls_accepted: ServiceControlAccept::STOP,
        exit_code: ServiceExitCode::Win32(0),
        checkpoint: 0,
        wait_hint: Duration::default(),
        process_id: None,
    })?;

    // Create a tokio runtime for the service tasks
    let rt = tokio::runtime::Runtime::new().unwrap();
    rt.block_on(async {
        // Run state recovery logic on startup
        crate::session::check_and_recover_state();
        
        // Start the named pipe IPC server — this is the main service loop.
        // It listens on \\.\pipe\declutter_ipc and handles StartLock / StopLock / GetStatus.
        crate::ipc::server::run_pipe_server().await;
    });

    status_handle.set_service_status(ServiceStatus {
        service_type: ServiceType::OWN_PROCESS,
        current_state: ServiceState::Stopped,
        controls_accepted: ServiceControlAccept::empty(),
        exit_code: ServiceExitCode::Win32(0),
        checkpoint: 0,
        wait_hint: Duration::default(),
        process_id: None,
    })?;

    Ok(())
}

fn install_service() {
    println!("Installing {}...", SERVICE_NAME);
    // In production, the NSIS installer handles 'sc create'. 
    // This could also use windows_service manager API, but relying on installer is cleaner.
    println!("Service installation should be handled by the NSIS installer via `sc create`.");
}

fn uninstall_service() {
    println!("Uninstalling {}...", SERVICE_NAME);
    // Same as above
    println!("Service uninstallation should be handled by the NSIS installer via `sc delete`.");
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = env::args().collect();

    if args.len() > 1 {
        match args[1].as_str() {
            "install" => install_service(),
            "uninstall" => uninstall_service(),
            "debug" => {
                println!("Running in debug mode (console)...");
                println!("Named pipe server listening on \\\\.\\pipe\\declutter_ipc");
                let rt = tokio::runtime::Runtime::new().unwrap();
                rt.block_on(async {
                    crate::session::check_and_recover_state();
                    crate::ipc::server::run_pipe_server().await;
                });
            }
            _ => println!("Unknown command. Use: install | uninstall | debug"),
        }
        return Ok(());
    }

    // Default to running as a Windows Service
    if let Err(e) = service_dispatcher::start(SERVICE_NAME, ffi_service_main) {
        println!("Error starting service: {}", e);
        // If not running under Service Control Manager, suggest debug mode
        println!("Run with 'debug' argument to run interactively.");
    }

    Ok(())
}
