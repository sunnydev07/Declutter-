use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::windows::named_pipe::ServerOptions;
use std::sync::atomic::Ordering;

use crate::ipc::protocol::{IpcMessage, StartLockRequest};
use crate::session;

const PIPE_NAME: &str = r"\\.\pipe\declutter_ipc";

/// Start the named pipe server. This function runs forever, accepting
/// client connections and spawning a handler task for each one.
/// It is safe to call from inside a `tokio::spawn` or `rt.block_on`.
pub async fn run_pipe_server() {
    loop {
        // Create a new pipe instance for the next client.
        // `first_pipe_instance(true)` is only needed on the very first call,
        // but ServerOptions handles that internally when the pipe doesn't exist yet.
        let server = match ServerOptions::new()
            .first_pipe_instance(false)
            .create(PIPE_NAME)
        {
            Ok(s) => s,
            Err(e) => {
                // If we can't create the pipe at all (very rare), wait and retry.
                eprintln!("[ipc] Failed to create pipe instance: {e}");
                tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
                continue;
            }
        };

        // Wait for a client to connect.
        if let Err(e) = server.connect().await {
            eprintln!("[ipc] Failed to accept client connection: {e}");
            continue;
        }

        // Spawn a task to handle this client so we can immediately go back
        // and accept the next connection.
        tokio::spawn(async move {
            if let Err(e) = handle_client(server).await {
                eprintln!("[ipc] Client handler error: {e}");
            }
        });
    }
}

/// Handle a single connected client.
///
/// Protocol (length-prefixed framing):
///   - Client sends: [4-byte LE payload length][JSON payload]
///   - Server responds: [4-byte LE payload length][JSON payload]
///
/// This avoids partial-read issues common with raw pipe I/O.
async fn handle_client(
    mut pipe: tokio::net::windows::named_pipe::NamedPipeServer,
) -> Result<(), Box<dyn std::error::Error>> {
    // Read the 4-byte length prefix.
    let mut len_buf = [0u8; 4];
    pipe.read_exact(&mut len_buf).await?;
    let msg_len = u32::from_le_bytes(len_buf) as usize;

    // Guard against absurdly large payloads (max 1 MB).
    if msg_len > 1_048_576 {
        let err_response = IpcMessage::Error("Payload too large".to_string());
        send_response(&mut pipe, &err_response).await?;
        return Ok(());
    }

    // Read the JSON payload.
    let mut buf = vec![0u8; msg_len];
    pipe.read_exact(&mut buf).await?;

    let response = match serde_json::from_slice::<IpcMessage>(&buf) {
        Ok(msg) => process_message(msg),
        Err(e) => IpcMessage::Error(format!("Invalid JSON: {e}")),
    };

    send_response(&mut pipe, &response).await?;

    // Flush before dropping to make sure the client gets the data.
    pipe.flush().await?;

    Ok(())
}

/// Serialize and write a length-prefixed response back to the client.
async fn send_response(
    pipe: &mut tokio::net::windows::named_pipe::NamedPipeServer,
    msg: &IpcMessage,
) -> Result<(), Box<dyn std::error::Error>> {
    let json = serde_json::to_vec(msg)?;
    let len = (json.len() as u32).to_le_bytes();
    pipe.write_all(&len).await?;
    pipe.write_all(&json).await?;
    Ok(())
}

/// Route an incoming `IpcMessage` to the appropriate session function
/// and return the response message.
fn process_message(msg: IpcMessage) -> IpcMessage {
    match msg {
        IpcMessage::StartLock(req) => {
            match session::start_session(
                req.duration_minutes,
                req.lock_mode,
                req.blocklist,
                req.whitelist,
            ) {
                Ok(()) => IpcMessage::Ack,
                Err(e) => IpcMessage::Error(e),
            }
        }
        IpcMessage::StopLock => {
            match session::end_session() {
                Ok(()) => IpcMessage::Ack,
                Err(e) => IpcMessage::Error(e),
            }
        }
        IpcMessage::GetStatus => {
            let is_locked = session::IS_ACTIVE.load(Ordering::SeqCst);
            let remaining = session::SECONDS_REMAINING.load(Ordering::SeqCst);

            IpcMessage::Status(crate::ipc::protocol::LockStatus {
                is_locked,
                remaining_seconds: remaining,
                current_mode: None, // Could be extended to read ACTIVE_MODE
                active_session_id: None,
            })
        }
        // Ack, Error, Status are client-bound messages; ignore if received.
        _ => IpcMessage::Error("Unexpected message type".to_string()),
    }
}
