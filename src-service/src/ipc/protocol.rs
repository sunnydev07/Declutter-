use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LockMode {
    Soft,
    App,
    View,
    Full,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StartLockRequest {
    pub duration_minutes: u32,
    pub lock_mode: LockMode,
    pub blocklist: Vec<String>,
    pub whitelist: Vec<String>,
    pub emergency_method: String,
    pub website_blocklist: Vec<String>,
    /// When true the session cannot be manually ended — only natural expiry is allowed.
    #[serde(default)]
    pub is_sword_mode: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LockStatus {
    pub is_locked: bool,
    pub remaining_seconds: u32,
    pub current_mode: Option<LockMode>,
    pub active_session_id: Option<String>,
    /// Mirrors IS_SWORD_MODE so the frontend can confirm the active enforcement state.
    pub is_sword_mode: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum IpcMessage {
    StartLock(StartLockRequest),
    StopLock,
    GetStatus,
    Status(LockStatus),
    Ack,
    Error(String),
}
